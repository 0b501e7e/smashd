import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack, useLocalSearchParams, router } from 'expo-router';
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
  
  // Poll for payment status
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout | null = null;
    
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
                await api.post(`/orders/${orderId}/confirm-payment`, { status: 'PAID' });
              } catch (orderUpdateError) {
                console.error('Error updating order status:', orderUpdateError);
              }
            }
            
            // Redirect to order confirmation
            router.push({
              pathname: '/order-confirmation',
              params: { 
                orderId: orderId!.toString(),
                transaction_id: status.transaction_id || ''
              }
            });
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
    console.log('Navigation state changed:', navState.url);
    
    // Check if redirected to success/return URL or contains checkout completion indicators
    if (navState.url.includes('success') || 
        navState.url.includes('order-confirmation') || 
        navState.url.includes('return') ||
        navState.url.includes('checkout?orderId')) {
      
      console.log('Detected completion URL, navigating to confirmation');
      
      // Extract transaction_id from URL if present
      const url = new URL(navState.url);
      const transactionId = url.searchParams.get('transaction_id') || '';
      
      // Navigate to confirmation screen
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
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerTitle: 'Processing Payment' }} />
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Preparing your payment...</ThemedText>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerTitle: 'Payment Error' }} />
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
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'SumUp Payment',
          headerLeft: () => (
            <ThemedText 
              style={styles.navButton}
              onPress={() => router.back()}
            >
              Cancel
            </ThemedText>
          ),
        }} 
      />
      
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
