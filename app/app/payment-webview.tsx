import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, BackHandler, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
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
          const response = await api.get(`/v1/payment/checkouts/${checkoutId}/status`);
          const status = response.data;
          console.log('SumUp payment status poll:', status);
          
          if (status?.status === 'PAID' || status?.status === 'SUCCESSFUL') {
            clearInterval(statusCheckInterval!);
            
            // Also update our order status in the backend
            if (orderId) {
              try {
                // Call the verify-payment endpoint. It doesn't require a body.
                await api.post(`/v1/orders/${orderId}/verify-payment`); 
                console.log(`payment-webview: Successfully called /verify-payment for order ${orderId}`);
                
                // Now, instead of going to order-confirmation, go to waiting-for-confirmation
                router.replace({ // Using replace so user can't go back to the webview easily
                  pathname: '/waiting-for-confirmation',
                  params: { orderId: orderId!.toString() },
                });

              } catch (orderUpdateError) {
                console.error('payment-webview: Error calling /verify-payment for order', orderId, orderUpdateError);
                setError('Error al verificar el pago con el restaurante. Por favor contacta al soporte.');
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
        setError('ID de pedido inválido');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(''); // Clear previous errors
        
        console.log('🚀 Initializing checkout for order:', orderId);
        const checkout = await sumupService.createCheckout(orderId);
        
        console.log('📦 Received checkout response:', checkout);
        
        // Validate the response structure
        if (!checkout) {
          console.error('❌ No checkout response received');
          throw new Error('No se recibió respuesta del servicio de pago');
        }
        
        if (!checkout.checkoutId) {
          console.error('❌ Missing checkoutId in response:', checkout);
          throw new Error('Falta el ID de pago en la respuesta');
        }
        
        if (!checkout.checkoutUrl) {
          console.error('❌ Missing checkoutUrl in response:', checkout);
          throw new Error('Falta la URL de pago en la respuesta');
        }
        
        console.log('✅ Checkout validation passed:', {
          checkoutId: checkout.checkoutId,
          checkoutUrl: checkout.checkoutUrl
        });
        
        setCheckoutId(checkout.checkoutId);
        setPaymentUrl(checkout.checkoutUrl);
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ Checkout initialization failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Error al inicializar el pago';
        console.error('❌ Error message:', errorMessage);
        
        setError(errorMessage);
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
    const REDIRECT_URL_BASE = 'https://example.com/order-confirmation'; 

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
      <View className="flex-1 justify-center items-center bg-black px-5">
        <ActivityIndicator size="large" color="#FAB10A" />
        <Text className="text-white text-base text-center mt-5">
          Preparando tu pago...
        </Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-black px-5">
        <Text className="text-red-500 text-base mb-5 text-center">
          {error}
        </Text>
        <TouchableOpacity 
          className="bg-yellow-500 px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-black text-base font-bold">
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View 
      className="flex-1 bg-black"
      style={{ 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom, 
        paddingLeft: insets.left, 
        paddingRight: insets.right 
      }}
    >
      {paymentUrl && (
        <WebView
          source={{ uri: paymentUrl }}
          className="flex-1"
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="absolute inset-0 justify-center items-center bg-black">
              <ActivityIndicator size="large" color="#FAB10A" />
            </View>
          )}
        />
      )}
    </View>
  );
}

