import React, { useEffect, useRef } from 'react';
import { StyleSheet, Alert, View, AppState, AppStateStatus, ScrollView, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import { sumupService } from '@/services/sumupService';
import api from '@/services/api';

export default function CheckoutScreen() {
  const { orderId: urlOrderId, returnToApp } = useLocalSearchParams();
  const { items, total, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const paymentAttemptedRef = useRef(false);
  const appStateListenerRef = useRef<any>(null);
  
  // Helper function to check order payment status
  const checkOrderStatus = async (orderIdToCheck: number): Promise<boolean> => {
    try {
      console.log('Checking status for order:', orderIdToCheck);
      const orderStatus = await sumupService.getPaymentStatus(orderIdToCheck);
      return orderStatus?.status === 'PAID';
    } catch (error) {
      console.error('Error checking order status:', error);
      return false;
    }
  };
  
  // Helper function to handle the outcome of payment status check
  const processPaymentOutcome = (isPaid: boolean, currentOrderId: number) => {
    if (isPaid) {
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
                params: { orderId: currentOrderId.toString() }
              });
            }
          }
        ],
        { cancelable: false }
      );
      clearCart();
    } else {
      Alert.alert(
        'Payment Not Confirmed Yet',
        'We couldn\'t confirm your payment yet. This may take a few moments to update. Try checking again in a few seconds, or check your order history later.',
        [{ text: 'OK' }]
      );
    }
    setIsProcessing(false);
  };
  
  // Effect for handling app state changes and URL parameters 
  useEffect(() => {
    const handleStatusCheck = async (orderToCheck: number) => {
      setIsProcessing(true);
      const isPaid = await checkOrderStatus(orderToCheck);
      processPaymentOutcome(isPaid, orderToCheck);
    };

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
          handleStatusCheck(numOrderId);
        }
      } catch (err) {
        console.error('Error parsing order ID:', err);
        setIsProcessing(false); // Ensure processing is false if parsing fails
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
        
        console.log('App returned to foreground. Checking status for order:', orderId);
        
        // Check order status
        handleStatusCheck(orderId);
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });
    
    return () => {
      if (appStateListenerRef.current) {
        appStateListenerRef.current.remove();
      }
    };
  }, [urlOrderId, returnToApp, orderId, clearCart, processPaymentOutcome]);
  
  const handlePlaceOrder = async () => {
    console.log(`[CheckoutScreen] handlePlaceOrder triggered. Current isProcessing: ${isProcessing}, items count: ${items.length}`);

    // Prevent duplicate order submissions by checking if already processing
    // This check is important if user somehow manages to press again before UI updates
    if (isProcessing) {
      console.log('[CheckoutScreen] Already processing, returning.');
      Alert.alert('Processing', 'Your order is already being processed. Please wait.');
      return;
    }

    if (items.length === 0) {
      console.log('[CheckoutScreen] Empty cart, returning.');
      // This alert should ideally not be needed if button is correctly disabled,
      // but as a safeguard:
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }
    
    console.log('[CheckoutScreen] IMMEDIATELY SETTING isProcessing = true');
    setIsProcessing(true); 

    // Allow state to propagate and UI to update before heavy async work
    await new Promise(resolve => setTimeout(resolve, 0)); 

    try {
      console.log('[CheckoutScreen] Starting order creation API call. isProcessing should be true now.');
      const orderItems = items.map(item => ({
        menuItemId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations || {}
      }));

      console.log('[CheckoutScreen] Attempting to create order with items:', JSON.stringify(orderItems));
      console.log('[CheckoutScreen] Attempting to create order with total:', total);

      const response = await orderAPI.createOrder({
        items: orderItems,
        collectionTime: "", // Consider if this needs a real value or different handling
        total: total
      });
      console.log('[CheckoutScreen] orderAPI.createOrder response:', response?.order?.id);

      if (response && response.order && response.order.id) {
        const createdOrderId = response.order.id;
        setOrderId(createdOrderId); 
        
        console.log(`[CheckoutScreen] Navigating to payment-webview for orderId: ${createdOrderId}`);
        router.push({
          pathname: '/payment-webview',
          params: { orderId: createdOrderId.toString() }
        });
        
        // Clear cart after initiating navigation.
        // If navigation itself could fail, might need more complex handling.
        clearCart();
        
        // If navigation is successful, this screen's "isProcessing" for this action is done.
        // No need to set setIsProcessing(false) here as we are moving away.
        // If the user comes back to this screen, isProcessing will be its default false.
      } else {
        console.error('[CheckoutScreen] Order creation failed: Missing order ID in response', response);
        Alert.alert('Error', 'Failed to prepare your order (missing order ID). Please try again.');
        setIsProcessing(false); // Reset on definite failure *before* navigation attempt
      }
    } catch (error: any) { // Added : any for error.message
      console.error('[CheckoutScreen] Error during order creation process:', error);
      Alert.alert('Error', `Failed to create your order. ${error.message || 'Please try again.'}`);
      setIsProcessing(false); // Reset on error
    } 
    // Removed the finally block that unconditionally set setIsProcessing(false)
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

  console.log('[CheckoutScreen] Rendering - isProcessing:', isProcessing);
  console.log('[CheckoutScreen] Rendering - items:', JSON.stringify(items));
  console.log('[CheckoutScreen] Style for minimalButton:', JSON.stringify(styles.minimalButton));
  console.log('[CheckoutScreen] Style for minimalButtonText:', JSON.stringify(styles.minimalButtonText));

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'Checkout',
          headerShown: true,
        }}
      />
      
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: 100 }]}
        >
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
        </ScrollView>

        <ThemedView style={[styles.buttonContainer, { 
          paddingBottom: Math.max(insets.bottom, 40) + 100
        }]}>
          <TouchableOpacity
            style={[
              styles.minimalButton,
              (isProcessing || items.length === 0) && styles.disabledButton,
            ]}
            onPress={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <View style={styles.processingContainer}> 
                <ActivityIndicator size="small" color="#ffffff" />
                <ThemedText style={[styles.minimalButtonText, styles.processingButtonText]}>Processing...</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.minimalButtonText}> 
                Place Order
              </ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    paddingBottom: 16,
  },
  orderSummary: {
    marginBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
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
  placeOrderButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  placeOrderButtonPressed: {
    backgroundColor: '#e67e00',
  },
  processingButton: {
    backgroundColor: '#cccccc',
  },
  placeOrderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  minimalButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  minimalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingButtonText: {
    marginLeft: 8,
  },
  customizationsContainer: {
    marginTop: 4,
  },
  customizationText: {
    color: '#666',
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
