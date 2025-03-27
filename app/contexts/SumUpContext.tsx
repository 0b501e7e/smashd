import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { SumUpProvider as NativeSumUpProvider } from 'sumup-react-native-alpha';
import api from '@/services/api';
import { Alert, Linking, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Get SumUp public key from environment variables
const SUMUP_PUBLIC_KEY = process.env.EXPO_PUBLIC_SUMUP_PUBLIC_KEY || 'sup_pk_your_key_here';

interface SumUpContextType {
  processPayment: (orderId: number) => Promise<boolean>;
  isProcessing: boolean;
  initiateCheckout: (orderId: number) => Promise<string>;
  success: string | null;
  error: string | null;
}

const SumUpContext = createContext<SumUpContextType>({
  processPayment: async () => false,
  isProcessing: false,
  initiateCheckout: async () => '',
  success: null,
  error: null,
});

// Create a custom hook to use the SumUp context
export const useSumUp = () => useContext(SumUpContext);

export function SumUpProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [initiatedCheckouts, setInitiatedCheckouts] = useState<Record<number, string>>({});
  const router = useRouter();
  const [appState, setAppState] = useState(AppState.currentState);

  // Listen for deep links and app state changes
  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check for initial URL when app is launched via deep link
    const getInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) handleDeepLink(url);
    };
    getInitialUrl();

    // Handle app state changes for payment completion
    const handleAppStateChange = (nextAppState: string) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come back to the foreground, check payment status
        if (activeOrderId) {
          checkPaymentStatus(activeOrderId);
        }
      }
      setAppState(nextAppState);
    };

    const stateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      stateSubscription.remove();
    };
  }, [activeOrderId]);

  // Handle deep links for payment completion
  const handleDeepLink = (url: string) => {
    if (url.includes('order-confirmation')) {
      // Parse the URL to get the orderId
      const params = url.split('?')[1];
      if (params) {
        const urlParams = new URLSearchParams(params);
        const orderId = urlParams.get('orderId');
        if (orderId) {
          const numOrderId = parseInt(orderId);
          // Check payment status once more to be sure
          checkPaymentStatus(numOrderId);
          // Navigate to order confirmation
          router.push(`/order-confirmation?orderId=${orderId}`);
        }
      }
    }
  };

  // Check payment status for an order
  const checkPaymentStatus = async (orderId: number) => {
    try {
      const statusResponse = await api.get(`/orders/${orderId}/status`);
      if (statusResponse.data.status === 'PAID') {
        setSuccess('Payment successfully processed!');
        setActiveOrderId(null);
        return true;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
    return false;
  };

  // Initiate checkout with SumUp
  const initiateCheckout = async (orderId: number): Promise<string> => {
    try {
      const response = await api.post('/initiate-checkout', { orderId });
      
      // The server response includes checkoutId directly, not in a success property
      if (!response.data || !response.data.checkoutId) {
        throw new Error(response.data?.error || 'Failed to initiate checkout');
      }
      
      const checkoutId = response.data.checkoutId;
      
      // Save this checkout ID to avoid duplicate initiations
      setInitiatedCheckouts(prev => ({
        ...prev,
        [orderId]: checkoutId
      }));
      
      return checkoutId;
    } catch (error: any) {
      console.error('Failed to initiate checkout:', error);
      setError('Failed to initiate checkout. Please try again.');
      throw error;
    }
  };
  
  // Process payment with SumUp
  const processPayment = async (orderId: number): Promise<boolean> => {
    // Don't process payment if we're already processing it
    if (isProcessing || activeOrderId === orderId) {
      console.log(`Already processing payment for order ${orderId}, skipping duplicate call`);
      return false;
    }

    setIsProcessing(true);
    setError(null);
    setActiveOrderId(orderId);
    
    try {
      console.log(`Processing payment for order: ${orderId}`);
      
      // Check if the checkout was already initiated
      let checkoutId = initiatedCheckouts[orderId];
      
      // If no checkout ID in our cache, check if the order already has one in the database
      if (!checkoutId) {
        try {
          const orderResponse = await api.get(`/orders/${orderId}/status`);
          checkoutId = orderResponse.data.sumupCheckoutId;
          
          // If found, save it to our cache
          if (checkoutId) {
            setInitiatedCheckouts(prev => ({
              ...prev,
              [orderId]: checkoutId
            }));
          }
        } catch (error) {
          console.log('Error checking order status, will continue with payment process:', error);
        }
      }
      
      // If still no checkout ID, we need to initiate checkout first
      if (!checkoutId) {
        console.log('No existing checkout found, initiating checkout...');
        try {
          const checkout = await initiateCheckout(orderId);
          checkoutId = checkout;
        } catch (error: any) {
          throw new Error('Failed to initiate checkout: ' + error.message);
        }
      } else {
        console.log(`Using existing checkout ID for order ${orderId}: ${checkoutId}`);
      }
      
      // Get the checkout URL
      console.log('Getting checkout URL...');
      const checkoutResponse = await api.post('/initiate-checkout', { orderId });
      console.log('Checkout response:', checkoutResponse.data);
      
      if (!checkoutResponse.data.checkoutUrl) {
        throw new Error('No checkout URL provided by SumUp');
      }
      
      const checkoutUrl = checkoutResponse.data.checkoutUrl;
      console.log(`Redirecting to SumUp checkout: ${checkoutUrl}`);

      // Start polling for payment status in the background
      startPollingForPaymentStatus(orderId);

      // Open the checkout URL in a browser
      await Linking.openURL(checkoutUrl);
      
      // We'll return true now, but the actual completion will be handled by the deep link handler
      // or by the polling mechanism
      return true;
    } catch (error) {
      console.error('Payment processing failed:', error);
      setError('Payment processing failed. Please try again.');
      setActiveOrderId(null);
      return false;
    } finally {
      setIsProcessing(false);
      
      // Clear success message after 5 seconds
      if (success) {
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      }
    }
  };
  
  // Start background polling for payment status
  const startPollingForPaymentStatus = async (orderId: number) => {
    // Set a longer timeout since the user will be in another app
    let attemptsLeft = 90; // Try for 90 seconds max (1.5 minutes)
    const checkInterval = 2000; // Check every 2 seconds

    const intervalId = setInterval(async () => {
      try {
        const statusResponse = await api.get(`/orders/${orderId}/status`);
        console.log(`Order status check (${attemptsLeft} left):`, statusResponse.data);
        
        if (statusResponse.data.status === 'PAID') {
          clearInterval(intervalId);
          setActiveOrderId(null);
          setSuccess('Payment successfully processed!');
          
          // If the app is in the foreground, navigate to order confirmation
          // This usually happens when the user returns to the app after payment
          if (appState === 'active') {
            router.push({
              pathname: '/order-confirmation',
              params: { orderId }
            });
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        attemptsLeft--;
        if (attemptsLeft <= 0) {
          clearInterval(intervalId);
          setActiveOrderId(null);
        }
      }
    }, checkInterval);
    
    // Store the interval ID to clear it if needed
    return () => clearInterval(intervalId);
  };

  // Helper function to poll for payment status
  const pollForPaymentStatus = async (orderId: number): Promise<boolean> => {
    let attemptsLeft = 15; // Try for 30 seconds max
    let isPaid = false;
    
    while (attemptsLeft > 0 && !isPaid) {
      // Wait 2 seconds between checks
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if the order has been paid
      try {
        const statusResponse = await api.get(`/orders/${orderId}/status`);
        console.log(`Order status check (${attemptsLeft} left):`, statusResponse.data);
        
        if (statusResponse.data.status === 'PAID') {
          isPaid = true;
          setSuccess('Payment successfully processed!');
          break;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
      
      attemptsLeft--;
    }
    
    return isPaid;
  };

  return (
    <SumUpContext.Provider
      value={{
        processPayment,
        isProcessing,
        initiateCheckout,
        success,
        error,
      }}
    >
      {children}
    </SumUpContext.Provider>
  );
}

// Main provider component that wraps the app
export function SumUpWrapper({ children }: { children: ReactNode }) {
  return (
    <NativeSumUpProvider publicKey={SUMUP_PUBLIC_KEY}>
      <SumUpProvider>
        {children}
      </SumUpProvider>
    </NativeSumUpProvider>
  );
} 