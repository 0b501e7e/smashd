import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Order Confirmed',
        headerLeft: () => null, // Prevent going back
      }} />
      <ThemedView style={[
        styles.container,
        { paddingTop: insets.top + 20 }
      ]}>
        <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />
        <ThemedText style={styles.title}>Order Confirmed!</ThemedText>
        <ThemedText style={styles.message}>
          Your order has been received and will be ready for collection at your selected time.
        </ThemedText>
{/*         
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(tabs)/orders')}>
          <ThemedText style={styles.buttonText}>View Order Status</ThemedText>
        </TouchableOpacity> */}
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/(tabs)/menu')}>
          <ThemedText style={styles.secondaryButtonText}>Back to Menu</ThemedText>
        </TouchableOpacity>
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
});
