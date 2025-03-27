import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCart } from '@/contexts/CartContext';
import { useSumUp } from '@/contexts/SumUpContext';
import { useRouter } from 'expo-router';
import { CartItem } from '@/types';

export default function Checkout() {
  const { order, setOrder, createOrder } = useCart();
  const { processPayment, isProcessing, initiateCheckout, isLoading, error, success } = useSumUp();
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsCreatingOrder(true);
      // Create order in the database
      const newOrder = await createOrder();
      
      if (newOrder) {
        // Initiate SumUp checkout
        await initiateCheckout(newOrder.id);
        
        // Process the payment
        const paymentSuccess = await processPayment(newOrder.id);
        
        if (paymentSuccess) {
          // Navigate to confirmation page
          router.push({
            pathname: '/confirmation'
          } as any);
        }
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Display loading states, error messages, or success messages
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      
      {/* Order Summary */}
      <View style={styles.orderSummary}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {order.items.map((item: CartItem) => (
          <View key={item.id} style={styles.itemRow}>
            <Text>{item.name} x{item.quantity}</Text>
            <Text>€{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total:</Text>
          <Text style={styles.totalText}>€{order.total.toFixed(2)}</Text>
        </View>
      </View>
      
      {/* Error and Success Messages */}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{success}</Text>}
      
      {/* Checkout Button */}
      <TouchableOpacity 
        style={[styles.checkoutButton, (isCreatingOrder || isProcessing || isLoading) && styles.disabledButton]}
        onPress={handleCheckout}
        disabled={isCreatingOrder || isProcessing || isLoading}
      >
        <Text style={styles.buttonText}>
          {isCreatingOrder || isProcessing || isLoading ? 'Processing...' : 'Pay with SumUp'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  orderSummary: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  totalText: {
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: 'blue',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginVertical: 10,
  },
  successText: {
    color: 'green',
    marginVertical: 10,
  },
  disabledButton: {
    opacity: 0.7,
  }
}); 