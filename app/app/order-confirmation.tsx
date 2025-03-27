import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { orderAPI } from '@/services/api';

type OrderStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'PAYMENT_FAILED';

export default function OrderConfirmationScreen() {
  const { orderId } = useLocalSearchParams();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('PAID');
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Fetch order status on mount and periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrderStatus = async () => {
      try {
        if (!orderId) return;
        
        const response = await orderAPI.getOrderStatus(Number(orderId));
        setOrderStatus(response.status);
        
        if (response.estimatedReadyTime) {
          const readyTime = new Date(response.estimatedReadyTime);
          const now = new Date();
          const minutesRemaining = Math.max(0, Math.round((readyTime.getTime() - now.getTime()) / 60000));
          
          if (minutesRemaining > 0) {
            setEstimatedTime(`${minutesRemaining} minutes`);
          } else {
            setEstimatedTime('Ready now!');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order status:', error);
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchOrderStatus();
    
    // Then every 30 seconds
    intervalId = setInterval(fetchOrderStatus, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [orderId]);

  // Get status message based on order status
  const getStatusMessage = () => {
    switch (orderStatus) {
      case 'PAID':
        return 'Your order has been paid for and is being prepared.';
      case 'CONFIRMED':
        return `Your order has been confirmed and will be ready in ${estimatedTime || 'a few minutes'}.`;
      case 'READY':
        return 'Your order is ready for collection!';
      case 'COMPLETED':
        return 'Your order has been completed. Thank you for your purchase!';
      case 'PAYMENT_FAILED':
        return 'There was an issue with your payment. Please try again.';
      default:
        return 'Your order has been received and will be ready for collection soon.';
    }
  };

  // Get appropriate icon based on order status
  const getStatusIcon = () => {
    switch (orderStatus) {
      case 'READY':
        return <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />;
      case 'PAYMENT_FAILED':
        return <IconSymbol name="exclamationmark.circle.fill" size={80} color="#FF5252" />;
      default:
        return <IconSymbol name="clock.fill" size={80} color="#0a7ea4" />;
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Order Status',
        headerLeft: () => null, // Prevent going back
      }} />
      <ThemedView style={[
        styles.container,
        { paddingTop: insets.top + 20 }
      ]}>
        {loading ? (
          <ActivityIndicator size="large" color="#0a7ea4" />
        ) : (
          <>
            {getStatusIcon()}
            <ThemedText style={styles.title}>
              {orderStatus === 'PAYMENT_FAILED' ? 'Payment Failed' : 'Order Confirmed!'}
            </ThemedText>
            <ThemedText style={styles.message}>
              {getStatusMessage()}
            </ThemedText>
            
            {orderStatus === 'PAID' || orderStatus === 'CONFIRMED' ? (
              <ThemedView style={styles.statusContainer}>
                <ThemedText style={styles.statusLabel}>Status:</ThemedText>
                <ThemedText style={styles.statusValue}>{orderStatus}</ThemedText>
              </ThemedView>
            ) : null}
            
            <ThemedView style={styles.orderIdContainer}>
              <ThemedText style={styles.orderIdLabel}>Order ID:</ThemedText>
              <ThemedText style={styles.orderIdValue}>#{orderId}</ThemedText>
            </ThemedView>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/(tabs)/menu')}>
              <ThemedText style={styles.secondaryButtonText}>Back to Menu</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  secondaryButtonText: {
    color: '#0a7ea4',
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusValue: {
    color: '#0a7ea4',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  orderIdValue: {
    color: '#0a7ea4',
  },
});
