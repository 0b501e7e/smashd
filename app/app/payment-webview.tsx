import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { sumupService } from '@/services/sumupService';
import api from '@/services/api';

export default function PaymentWebviewScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const params = useLocalSearchParams();
  const orderId = params.orderId ? Number(params.orderId) : null;
  const insets = useSafeAreaInsets();
  
  // Poll for payment status
  useEffect(() => {
    let statusCheckInterval: ReturnType<typeof setInterval> | null = null;
    
    if (checkoutId && !isLoading) {
      statusCheckInterval = setInterval(async () => {
        try {
          // Check SumUp checkout status directly
          const response = await api.get(`/checkouts/${checkoutId}/status`);
          const status = response.data;
          console.log('SumUp payment status poll:', status);
          
          if (status?.status === 'PAID' || status?.status === 'SUCCESSFUL') {
            clearInterval(statusCheckInterval!);
            
            // Also update our order status in the backend
            if (orderId) {
              try {
                // Call the verify-payment endpoint. It doesn't require a body.
                await api.post(`/orders/${orderId}/verify-payment`); 
                console.log(`payment-webview: Successfully called /verify-payment for order ${orderId}`);
                
                // Now, instead of going to order-confirmation, go to waiting-for-confirmation
                router.replace({ // Using replace so user can't go back to the webview easily
                  pathname: '/waiting-for-confirmation',
                  params: { orderId: orderId!.toString() },
                });

              } catch (orderUpdateError) {
                console.error('payment-webview: Error calling /verify-payment for order', orderId, orderUpdateError);
                setError('Failed to verify payment with the restaurant. Please contact support.');
                // Potentially navigate to an error screen or back to cart
              }
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [checkoutId, isLoading, orderId]);
  
  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    
    return () => backHandler.remove();
  }, []);
  
  // Initialize checkout
  useEffect(() => {
    const initializeCheckout = async () => {
      if (!orderId) {
        setError('Invalid order ID');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const checkout = await sumupService.createCheckout(orderId);
        
        if (!checkout || !checkout.checkoutId || !checkout.checkoutUrl) {
          throw new Error('Invalid checkout response');
        }
        
        setCheckoutId(checkout.checkoutId);
        setPaymentUrl(checkout.checkoutUrl);
        setIsLoading(false);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
        setIsLoading(false);
      }
    };
    
    initializeCheckout();
  }, [orderId]);
  
  // Handle WebView navigation state changes
  const handleNavigationStateChange = (navState: any) => {
    console.log('WebView Navigating to:', navState.url);

    // More robust check: SumUp's redirect_url often contains query params like 'id' and 'status'
    // or 'transaction_id'. The key is not to navigate prematurely based on this URL alone.
    // The polling mechanism is responsible for verifying actual payment success.

    // Example of a SumUp redirect URL after payment attempt:
    // http://localhost:3000/order-confirmation?id=CHECKOUT_ID&status=pending&transaction_id=TRANSACTION_ID
    // Or for failure: http://localhost:3000/order-confirmation?id=CHECKOUT_ID&status=failed

    // We detect if the URL is our redirect_url.
    // If it is, the user has finished their interaction with SumUp (paid, cancelled, or failed).
    // The polling useEffect will pick up the actual status.
    // We don't need to do an immediate router.push here as it might be premature.

    // FIXME: This should ideally come from a shared config or environment variable
    const REDIRECT_URL_BASE = 'http://localhost:3000/order-confirmation'; 

    const isRedirectUrl = navState.url.startsWith(REDIRECT_URL_BASE);

    if (isRedirectUrl) {
      console.log('Detected navigation to redirect URL. Polling will confirm payment status.');
      // It might be useful to stop the WebView loading or show a message here,
      // but the primary confirmation comes from polling.
      // For instance, you could hide the WebView and show a "Verifying payment..." message.
    }
    
    // The original logic that caused premature navigation is removed:
    /*
    if (navState.url.includes('success') || 
        navState.url.includes('order-confirmation') || 
        navState.url.includes('return') ||
        navState.url.includes('checkout?orderId')) {
      
      console.log('Detected completion URL, navigating to confirmation');
      
      const url = new URL(navState.url);
      const transactionId = url.searchParams.get('transaction_id') || '';
      
      if (orderId) {
        router.push({
          pathname: '/order-confirmation',
          params: { 
            orderId: orderId.toString(),
            transaction_id: transactionId
          }
        });
      }
    }
    */
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Preparing your payment...</ThemedText>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <ThemedText 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          Go Back
        </ThemedText>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {paymentUrl && (
        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
  },
  navButton: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
