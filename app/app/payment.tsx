import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { PaymentWebView } from '@/components/PaymentWebView';
import { sumupService } from '@/services/sumupService';
import * as Haptics from 'expo-haptics';

export default function PaymentScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const params = useLocalSearchParams();
  const orderId = params.orderId ? Number(params.orderId) : null;

  useEffect(() => {
    if (!orderId) {
      setError('Missing order ID');
      setIsLoading(false);
      return;
    }

    const initializeCheckout = async () => {
      try {
        console.log('Initializing checkout for order:', orderId);
        
        // Initialize the SumUp checkout
        const checkout = await sumupService.initiateCheckout(orderId);
        console.log('Checkout initialized:', checkout);
        
        // Save the checkout URL
        setCheckoutUrl(checkout.checkoutUrl);
      } catch (error: any) {
        console.error('Payment initialization error:', error);
        setError(error.message || 'Failed to initialize payment');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        Alert.alert(
          'Payment Error',
          'Could not initialize payment. Please try again.',
          [{ text: 'Go Back', onPress: () => router.back() }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeCheckout();
  }, [orderId]);

  // Handle payment completion (success or failure)
  const handlePaymentComplete = (success: boolean) => {
    if (success) {
      // On successful payment, redirect to order confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/order-confirmation',
        params: { orderId: orderId?.toString() || '' }
      });
    } else {
      // On failed payment, show retry options
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Payment Failed',
        'Your payment was not successful. What would you like to do?',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setIsLoading(true);
              setError(null);
              setCheckoutUrl(null);
              
              // Reinitialize checkout
              const initAgain = async () => {
                try {
                  const checkout = await sumupService.initiateCheckout(orderId!);
                  setCheckoutUrl(checkout.checkoutUrl);
                } catch (error: any) {
                  console.error('Payment reinitialization error:', error);
                  setError(error.message || 'Failed to initialize payment');
                } finally {
                  setIsLoading(false);
                }
              };
              
              initAgain();
            }
          },
          {
            text: 'Cancel',
            onPress: () => router.back(),
            style: 'cancel'
          }
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: 'Payment' }} />
        <ActivityIndicator size="large" color="#ff8c00" />
        <ThemedText style={styles.loadingText}>Preparing payment...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !checkoutUrl) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: 'Payment Error' }} />
        <ThemedText style={styles.errorText}>{error || 'Could not load payment page'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.containerFull}>
      <Stack.Screen options={{ headerTitle: 'Complete Payment' }} />
      <PaymentWebView
        checkoutUrl={checkoutUrl}
        onPaymentComplete={handlePaymentComplete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  containerFull: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  }
}); 