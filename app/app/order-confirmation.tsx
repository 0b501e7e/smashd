import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/IconSymbol';

type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

type OrderDetails = {
  id: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
  total: number;
  status: OrderStatus;
  estimatedReadyTime: string | null;
  createdAt: string;
  transactionId?: string;
};

export default function OrderConfirmationScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId || params.order_id;
  const transactionId = params.transaction_id;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const numOrderId = Number(orderId);
        if (isNaN(numOrderId)) {
          setError('Invalid order ID');
          setLoading(false);
          return;
        }
        
        const orderDetails = await orderAPI.getOrderStatus(numOrderId);
        setOrder(orderDetails);
        
        // Provide success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        console.error('Error fetching order details:', error);
        setError(error.message || 'Failed to load order details');
        
        // Provide error feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);
  
  // Format estimated ready time
  const getEstimatedReadyTime = () => {
    if (!order || !order.createdAt) return 'Unknown';
    
    try {
      // Use estimatedReadyTime if available
      if (order.estimatedReadyTime) {
        return new Date(order.estimatedReadyTime).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      // Fall back to a default of 15-20 minutes if no estimatedReadyTime
      const createdDate = new Date(order.createdAt);
      const readyDate = new Date(createdDate.getTime() + 20 * 60000);
      return readyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error calculating ready time:', error);
      return 'Unknown';
    }
  };
  
  // Get status color and icon based on order status
  const getStatusInfo = () => {
    if (!order) return { color: '#ccc', icon: 'clock', text: 'Unknown' };
    
    switch (order.status) {
      case 'PAID':
        return { color: '#4caf50', icon: 'checkmark.circle.fill', text: 'Payment Confirmed' };
      case 'PREPARING':
        return { color: '#ff9800', icon: 'flame.fill', text: 'Preparing Your Order' };
      case 'READY':
        return { color: '#2196f3', icon: 'bell.fill', text: 'Ready for Collection' };
      case 'COMPLETED':
        return { color: '#4caf50', icon: 'checkmark.circle.fill', text: 'Order Completed' };
      case 'CANCELLED':
        return { color: '#f44336', icon: 'xmark.circle.fill', text: 'Order Cancelled' };
      default:
        return { color: '#ff9800', icon: 'clock', text: 'Processing' };
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: 'Order Confirmation' }} />
        <ActivityIndicator size="large" color="#ff8c00" />
        <ThemedText style={styles.loadingText}>Loading order details...</ThemedText>
      </ThemedView>
    );
  }
  
  // Error state
  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerTitle: 'Order Error' }} />
        <IconSymbol name="exclamationmark.triangle.fill" size={60} color="#f44336" />
        <ThemedText style={styles.errorText}>
          {error || 'Could not load order details'}
        </ThemedText>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <ThemedText style={styles.buttonText}>Return to Menu</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Success state - order details
  const statusInfo = getStatusInfo();
  
  return (
    <ThemedView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerTitle: 'Order Confirmation' }} />
      
      <ThemedView style={styles.header}>
        <IconSymbol name="checkmark.circle.fill" size={80} color="#4caf50" />
        <ThemedText type="title" style={styles.headerTitle}>
          Thank You for Your Order!
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Your order has been confirmed and paid.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.orderInfo}>
        <ThemedView style={styles.orderInfoRow}>
          <ThemedText style={styles.orderInfoLabel}>Order Number:</ThemedText>
          <ThemedText style={styles.orderInfoValue}>#{order.id}</ThemedText>
        </ThemedView>
        
        {transactionId && (
          <ThemedView style={styles.orderInfoRow}>
            <ThemedText style={styles.orderInfoLabel}>Transaction ID:</ThemedText>
            <ThemedText style={styles.orderInfoValue}>{transactionId}</ThemedText>
          </ThemedView>
        )}
        
        <ThemedView style={styles.orderInfoRow}>
          <ThemedText style={styles.orderInfoLabel}>Status:</ThemedText>
          <ThemedView style={styles.statusBadge}>
            <IconSymbol name={statusInfo.icon as any} size={16} color={statusInfo.color} />
            <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        <ThemedView style={styles.orderInfoRow}>
          <ThemedText style={styles.orderInfoLabel}>Collection Time:</ThemedText>
          <ThemedText style={styles.orderInfoValue}>
            Approximately {getEstimatedReadyTime()}
          </ThemedText>
        </ThemedView>
      </ThemedView>
      
      <ThemedView style={styles.orderSummary}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Order Summary
        </ThemedText>
        
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <ThemedView key={index} style={styles.itemRow}>
              <ThemedView style={styles.itemInfo}>
                <ThemedText style={styles.itemName}>
                  {item.name} x{item.quantity}
                </ThemedText>
                
                {item.customizations && (
                  <ThemedView style={styles.customizationsContainer}>
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
                  </ThemedView>
                )}
              </ThemedView>
              
              <ThemedText style={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </ThemedText>
            </ThemedView>
          ))
        ) : (
          <ThemedText style={styles.noItemsText}>
            Loading order items...
          </ThemedText>
        )}
        
        <ThemedView style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Total:</ThemedText>
          <ThemedText style={styles.totalAmount}>${order.total.toFixed(2)}</ThemedText>
        </ThemedView>
      </ThemedView>
      
      <ThemedView style={styles.instructions}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Collection Instructions
        </ThemedText>
        
        <ThemedText style={styles.instructionText}>
          Please show this screen when you arrive to collect your order. 
          Your order will be ready in approximately 15-20 minutes.
        </ThemedText>
      </ThemedView>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/menu')}
      >
        <ThemedText style={styles.buttonText}>Return to Menu</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  orderInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderSummary: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customizationsContainer: {
    marginTop: 4,
  },
  customizationText: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  instructions: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff8c00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noItemsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
