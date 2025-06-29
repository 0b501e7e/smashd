import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { orderAPI } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define the expected type for order status data
type OrderStatusData = {
  id: number;
  status: string; // PENDING, PAID, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
  // Add other fields if needed, but status is key here
};

export default function WaitingForConfirmationScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId; // Expecting orderId to be passed as a string
  
  const [loadingMessage, setLoadingMessage] = useState('Waiting for restaurant to confirm your order...');
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!orderId || typeof orderId !== 'string') {
      setError('Order ID is missing or invalid.');
      console.error('WaitingForConfirmationScreen: Order ID is missing or invalid', orderId);
      // Optionally, navigate back or to an error screen
      // router.replace('/(tabs)/menu'); 
      return;
    }

    const numOrderId = Number(orderId);
    if (isNaN(numOrderId)) {
      setError('Invalid Order ID format.');
      console.error('WaitingForConfirmationScreen: Invalid Order ID format', orderId);
      return;
    }

    console.log(`WaitingForConfirmationScreen: Polling for order ${numOrderId}`);

    const intervalId = setInterval(async () => {
      try {
        const orderStatusData: OrderStatusData = await orderAPI.getOrderStatus(numOrderId);
        console.log(`WaitingForConfirmationScreen: Order ${numOrderId} status: ${orderStatusData.status}`);

        if (orderStatusData.status === 'CONFIRMED') {
          clearInterval(intervalId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: '/order-confirmation',
            params: { orderId: orderId }, // Pass orderId as string
          });
        } else if (orderStatusData.status === 'CANCELLED' || orderStatusData.status === 'DECLINED_BY_RESTAURANT') {
          clearInterval(intervalId);
          setError('Unfortunately, your order could not be confirmed by the restaurant at this time. Please contact us for assistance.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          // Consider navigating to a different screen or showing options
        }
        // Continue polling for other statuses like PENDING, PAID
      } catch (err: any) {
        console.error(`WaitingForConfirmationScreen: Error polling order status for ${numOrderId}:`, err);
        // Potentially set an error message, but be careful about stopping polling for recoverable errors
        // setError('Having trouble confirming your order. We are still trying.');
      }
    }, 7000); // Poll every 7 seconds

    return () => clearInterval(intervalId); // Cleanup interval
  }, [orderId]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ff8c00" style={styles.activityIndicator} />
        <ThemedText type="subtitle" style={styles.messageText}>
          {loadingMessage}
        </ThemedText>
        {error && (
          <ThemedText type="default" style={styles.errorText}>
            {error}
          </ThemedText>
        )}
        <ThemedText type="defaultSemiBold" style={styles.noticeText}>
          Please keep this screen open.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark theme background
  },
  content: {
    padding: 20,
    alignItems: 'center',
    width: '90%',
    backgroundColor: '#1e1e1e', // Slightly lighter card background
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activityIndicator: {
    marginBottom: 30,
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#e0e0e0', // Light text for dark theme
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ff6b6b', // Error color
    marginTop: 10,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#aaaaaa', // Subtler notice text
  },
}); 