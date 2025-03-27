import React from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI, paymentAPI } from '@/services/api';
import { useSumUp } from '@/contexts/SumUpContext';
import { PaymentSheet } from 'sumup-react-native-alpha';

type CollectionTime = '15mins' | '30mins' | '45mins' | '60mins';

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCart();
  const [selectedTime, setSelectedTime] = useState<CollectionTime>('30mins');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const { processPayment, initiateCheckout, isProcessing: isPaymentProcessing, error } = useSumUp();
  const insets = useSafeAreaInsets();

  const handlePlaceOrder = async () => {
    // Prevent duplicate order submissions by checking if already processing
    if (isProcessing || isPaymentProcessing) {
      Alert.alert('Processing', 'Your order is already being processed. Please wait.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }
    
    setIsProcessing(true);
    try {
      // First create the order in our backend
      const orderItems = items.map(item => ({
        menuItemId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations || {}
      }));

      console.log('Sending order items:', orderItems);

      const response = await orderAPI.createOrder({
        items: orderItems,
        collectionTime: selectedTime,
        total: total
      });

      console.log('Order created:', response);
      
      // Store the order ID for payment processing
      setOrderId(response.order.id);
      
      // First, initiate the SumUp checkout to get a checkout ID
      try {
        await initiateCheckout(response.order.id);
        
        // Process payment with SumUp
        const paymentSuccess = await processPayment(response.order.id);
        
        if (paymentSuccess) {
          // If payment was successful, clear cart and navigate to confirmation
          clearCart();
          router.push({
            pathname: '/order-confirmation',
            params: { orderId: response.order.id.toString() }
          });
        } else {
          // Payment failed or was cancelled
          setIsProcessing(false);
          Alert.alert(
            'Payment Incomplete',
            'Your payment was not completed. You can try again or come back later to complete your order.'
          );
        }
      } catch (checkoutError: any) {
        console.error('Checkout error:', checkoutError);
        setIsProcessing(false);
        Alert.alert(
          'Checkout Error',
          checkoutError.message || 'There was a problem with the payment process. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      setIsProcessing(false);
      Alert.alert(
        'Order Error',
        error.message || 'There was a problem processing your order. Please try again.'
      );
    }
  };

  // Display informative message based on processing state
  const getButtonText = () => {
    if (isProcessing) {
      return 'Processing...';
    } else if (isPaymentProcessing) {
      return 'Preparing Checkout...';
    }
    return 'Place Order';
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ThemedView style={[
        styles.container, 
        { paddingTop: insets.top + 20 }
      ]}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Order Summary</ThemedText>
          {items.map(item => (
            <ThemedView key={item.id} style={styles.itemRow}>
              <ThemedText>{item.quantity}x {item.name}</ThemedText>
              <ThemedText>${(item.price * item.quantity).toFixed(2)}</ThemedText>
            </ThemedView>
          ))}
          <ThemedView style={styles.totalRow}>
            <ThemedText type="subtitle">Total</ThemedText>
            <ThemedText type="subtitle">${total.toFixed(2)}</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Collection Time</ThemedText>
          <ThemedView style={styles.timeSelector}>
            {(['15mins', '30mins', '45mins', '60mins'] as CollectionTime[]).map(time => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeOption,
                  selectedTime === time && styles.selectedTime,
                ]}
                onPress={() => setSelectedTime(time)}
                disabled={isProcessing || isPaymentProcessing}>
                <ThemedText style={[
                  styles.timeText,
                  selectedTime === time && styles.selectedTimeText,
                ]}>
                  {time}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}

        <TouchableOpacity
          style={[
            styles.placeOrderButton, 
            (isProcessing || isPaymentProcessing) && styles.processingButton
          ]}
          onPress={handlePlaceOrder}
          disabled={isProcessing || isPaymentProcessing}>
          <ThemedText style={styles.placeOrderText}>
            {getButtonText()}
          </ThemedText>
        </TouchableOpacity>
        
        {/* Include PaymentSheet component */}
        <PaymentSheet />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    gap: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTime: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  timeText: {
    color: '#666',
  },
  selectedTimeText: {
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
  },
  placeOrderButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  processingButton: {
    backgroundColor: '#cccccc',
  },
  placeOrderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
