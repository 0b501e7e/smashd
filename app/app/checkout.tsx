import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CollectionTime = '15mins' | '30mins' | '45mins' | '60mins';

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCart();
  const [selectedTime, setSelectedTime] = useState<CollectionTime>('30mins');
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with your backend API
      // const response = await fetch('YOUR_API/orders', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     items,
      //     collectionTime: selectedTime,
      //     total,
      //   }),
      // });

      // if (response.ok) {
      clearCart();
      router.push('/order-confirmation');
      // }
    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

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
                onPress={() => setSelectedTime(time)}>
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

        <TouchableOpacity
          style={[styles.placeOrderButton, isProcessing && styles.processingButton]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}>
          <ThemedText style={styles.placeOrderText}>
            {isProcessing ? 'Processing...' : 'Place Order'}
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
