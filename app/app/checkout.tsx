import React, { useEffect, useRef } from 'react';
import { StyleSheet, Alert, View, AppState, AppStateStatus } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import { sumupService } from '@/services/sumupService';
import api from '@/services/api';

type CollectionTime = '15mins' | '30mins' | '45mins' | '60mins';

export default function CheckoutScreen() {
  const { orderId: urlOrderId, returnToApp } = useLocalSearchParams();
  const { items, total, clearCart } = useCart();
  const [selectedTime, setSelectedTime] = useState<CollectionTime>('30mins');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const paymentAttemptedRef = useRef(false);
  const appStateListenerRef = useRef<any>(null);
  
  // Helper function to check order payment status
  const checkOrderStatus = async (orderId: number): Promise<boolean> => {
    try {
      console.log('Checking status for order:', orderId);
      const orderStatus = await sumupService.getPaymentStatus(orderId);
      return orderStatus?.status === 'PAID';
    } catch (error) {
      console.error('Error checking order status:', error);
      return false;
    }
  };
  
  // Effect for handling app state changes and URL parameters 
  useEffect(() => {
    // Check if we're returning from payment with orderID
    if (urlOrderId) {
      console.log('URL order ID detected:', urlOrderId);
      try {
        const numOrderId = typeof urlOrderId === 'string' ? parseInt(urlOrderId) : 
                          Array.isArray(urlOrderId) ? parseInt(urlOrderId[0]) : Number(urlOrderId);
        
        if (!isNaN(numOrderId)) {
          console.log('Setting order ID and checking status for:', numOrderId);
          setOrderId(numOrderId);
          
          // Always check if we're returning from payment
          paymentAttemptedRef.current = true;
          
          // Check the order status
          checkOrderStatus(numOrderId).then(isPaid => {
            if (isPaid) {
              // Show success message
              Alert.alert(
                'Payment Successful',
                'Your payment was processed successfully. Would you like to view your order status?',
                [
                  {
                    text: 'Not Now',
                    style: 'cancel', 
                    onPress: () => {
                      setIsProcessing(false);
                      paymentAttemptedRef.current = false;
                      router.push('/(tabs)/menu');
                    }
                  },
                  {
                    text: 'View Order',
                    onPress: () => {
                      setIsProcessing(false);
                      paymentAttemptedRef.current = false;
                      router.push({
                        pathname: '/order-confirmation',
                        params: { orderId: numOrderId.toString() }
                      });
                    }
                  }
                ],
                { cancelable: false } // Force the user to make a choice
              );
              // Clear cart on success
              clearCart();
            } else {
              // Show a message that payment hasn't been confirmed yet
              Alert.alert(
                'Payment Not Confirmed Yet',
                'We couldn\'t confirm your payment yet. This may take a few moments to update. Try checking again in a few seconds, or check your order history later.',
                [{ text: 'OK' }]
              );
            }
            setIsProcessing(false);
          });
        }
      } catch (err) {
        console.error('Error parsing order ID:', err);
      }
    }
    
    // Cleanup any existing app state listener
    if (appStateListenerRef.current) {
      appStateListenerRef.current.remove();
    }
    
    // Listen for app state changes - only needed when returning from payment and not being on payment screen
    appStateListenerRef.current = AppState.addEventListener('change', nextAppState => {
      console.log(`App state changed from ${appState.current} to ${nextAppState}`);
      
      // Only handle foreground event for orders we already know about
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        paymentAttemptedRef.current && 
        orderId
      ) {
        // Add a safeguard to prevent multiple status checks
        if (isProcessing) {
          console.log('Already processing, skipping additional status check');
          return;
        }
        
        const orderToCheck = orderId || (
          urlOrderId ? (
            typeof urlOrderId === 'string' ? parseInt(urlOrderId) : 
            Array.isArray(urlOrderId) ? parseInt(urlOrderId[0]) : Number(urlOrderId)
          ) : null
        );
        
        if (orderToCheck && !isNaN(orderToCheck)) {
          console.log('App returned to foreground. Checking status for order:', orderToCheck);
          
          // Check order status
          setIsProcessing(true);
          checkOrderStatus(orderToCheck).then(isPaid => {
            if (isPaid) {
              // Handle successful payment
              clearCart();
              
              // Show success dialog
              Alert.alert(
                'Payment Successful',
                'Your payment was processed successfully. Would you like to view your order status?',
                [
                  {
                    text: 'Not Now',
                    style: 'cancel', 
                    onPress: () => {
                      setIsProcessing(false);
                      paymentAttemptedRef.current = false;
                      router.push('/(tabs)/menu');
                    }
                  },
                  {
                    text: 'View Order',
                    onPress: () => {
                      setIsProcessing(false);
                      paymentAttemptedRef.current = false;
                      router.push({
                        pathname: '/order-confirmation',
                        params: { orderId: orderToCheck.toString() }
                      });
                    }
                  }
                ],
                { cancelable: false }
              );
            } else {
              // Show not confirmed message
              Alert.alert(
                'Payment Not Confirmed Yet',
                'We couldn\'t confirm your payment yet. This may take a few moments to update. Try checking again in a few seconds, or check your order history later.',
                [{ text: 'OK' }]
              );
              setIsProcessing(false);
            }
          });
        }
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });
    
    return () => {
      if (appStateListenerRef.current) {
        appStateListenerRef.current.remove();
      }
    };
  }, [urlOrderId, returnToApp, orderId, clearCart]);
  
  const handlePlaceOrder = async () => {
    // Prevent duplicate order submissions by checking if already processing
    if (isProcessing) {
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

      // Get the order ID from the response
      if (response && response.order && response.order.id) {
        const createdOrderId = response.order.id;
        setOrderId(createdOrderId);
        
        // Navigate to the webview payment screen with the order ID
        router.push({
          pathname: '/payment-webview',
          params: { orderId: createdOrderId.toString() }
        });
        
        // Clear the cart after creating the order
        clearCart();
      } else {
        throw new Error('Missing order ID in response');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Display informative message based on processing state
  const getButtonText = () => {
    if (isProcessing) {
      return 'Processing...';
    }
    return 'Place Order';
  }

  // Helper to go to confirmation screen for testing
  const goToConfirmation = () => {
    if (orderId) {
      router.push({
        pathname: '/order-confirmation',
        params: { orderId: orderId.toString() }
      });
    }
  };

  // Determine if each item has the same key as the first item with the same ID
  // and add a more unique key that includes customizations
  const renderItems = () => {
    return items.map((item, index) => {
      // Using a composite key that includes id, index, and customizations
      const key = `${item.id}-${index}-${JSON.stringify(item.customizations)}`;
      
      return (
        <ThemedView key={key} style={styles.itemRow}>
          <View style={styles.itemDetails}>
            <ThemedText type="subtitle" style={styles.itemName}>
              {item.name}
            </ThemedText>
            
            {item.customizations && (
              <View style={styles.customizationsContainer}>
                {item.customizations.extras && item.customizations.extras.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Extras: {item.customizations.extras.join(', ')}
                  </ThemedText>
                )}
                
                {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Sauces: {item.customizations.sauces.join(', ')}
                  </ThemedText>
                )}
                
                {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Toppings: {item.customizations.toppings.join(', ')}
                  </ThemedText>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.priceSection}>
            <ThemedText type="default" style={styles.quantity}>
              x{item.quantity}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.price}>
              ${(item.price * item.quantity).toFixed(2)}
            </ThemedText>
          </View>
        </ThemedView>
      );
    });
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'Checkout',
          headerShown: true,
        }}
      />
      
      <ThemedView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ThemedView style={styles.orderSummary}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Order Summary
          </ThemedText>
          
          <ThemedView style={styles.itemsList}>
            {renderItems()}
          </ThemedView>
          
          <ThemedView style={styles.totalRow}>
            <ThemedText type="subtitle">Total: </ThemedText>
            <ThemedText type="subtitle" style={styles.totalAmount}>
              ${total.toFixed(2)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        <ThemedView style={styles.collectSection}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Collection Time
          </ThemedText>
          
          <ThemedView style={styles.timeOptions}>
            {(['15mins', '30mins', '45mins', '60mins'] as CollectionTime[]).map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeOption,
                  selectedTime === time && styles.selectedTime
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <ThemedText
                  style={[
                    styles.timeText,
                    selectedTime === time && styles.selectedTimeText
                  ]}
                >
                  {time}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>
        
        <ThemedText style={styles.instructionText}>
          Your order will be ready for collection in approximately {selectedTime}.
          Please proceed to checkout to confirm your order.
        </ThemedText>

        <TouchableOpacity
          style={[
            styles.placeOrderButton, 
            isProcessing && styles.processingButton
          ]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}>
          <ThemedText style={styles.placeOrderText}>
            {getButtonText()}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  orderSummary: {
    marginBottom: 24,
    gap: 16,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  quantity: {
    color: '#666',
  },
  price: {
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  totalAmount: {
    fontWeight: 'bold',
  },
  collectSection: {
    marginBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeOptions: {
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
  customizationsContainer: {
    marginTop: 4,
  },
  customizationText: {
    color: '#666',
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
  testButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  instructionText: {
    marginBottom: 16,
  },
});
