import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  const handleCheckout = () => {
    if (!isLoggedIn) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <ThemedView style={[styles.emptyContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ThemedText style={styles.emptyText}>Tu carrito está vacío</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFE4B5', dark: '#8B4513' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <ThemedText style={[
            styles.headerText, 
            { 
              padding: 20,
              lineHeight: 48,
              height: 100
            }
          ]}>
            Tu Carrito
          </ThemedText>
        </ThemedView>
      }>
      <ThemedView style={styles.container}>
        {items.map((item, index) => (
          <ThemedView 
            key={`${item.id}-${index}-${JSON.stringify(item.customizations)}`} 
            style={styles.cartItem}>
            <ThemedView style={styles.itemInfo}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <ThemedText type="subtitle" style={{ flexShrink: 1 }}>{item.name}</ThemedText>
              </View>
              <ThemedText>€{item.price.toFixed(2)}</ThemedText>
            </ThemedView>
            
            {item.customizations && (
              <ThemedView style={styles.customizationsContainer}>
                {item.customizations.extras && item.customizations.extras.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Extras: {item.customizations.extras.join(', ')}
                  </ThemedText>
                )}
                
                {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Salsas: {item.customizations.sauces.join(', ')}
                  </ThemedText>
                )}
                
                {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                  <ThemedText style={styles.customizationText}>
                    Ingredientes: {item.customizations.toppings.join(', ')}
                  </ThemedText>
                )}
              </ThemedView>
            )}
            
            <ThemedView style={styles.quantityControls}>
              <TouchableOpacity
                onPress={() => updateQuantity(Number(item.id), Math.max(0, item.quantity - 1))}
                style={styles.quantityButton}>
                <ThemedText style={{ color: '#333' }}>-</ThemedText>
              </TouchableOpacity>
              <ThemedText>{item.quantity}</ThemedText>
              <TouchableOpacity
                onPress={() => updateQuantity(Number(item.id), item.quantity + 1)}
                style={styles.quantityButton}>
                <ThemedText style={{ color: '#333' }}>+</ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <TouchableOpacity
              onPress={() => removeItem(Number(item.id))}
              style={styles.removeButton}>
              <ThemedText style={styles.removeButtonText}>Eliminar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ))}

        <ThemedView style={styles.totalContainer}>
          <ThemedText type="subtitle">Total: €{total.toFixed(2)}</ThemedText>
          <TouchableOpacity 
            style={styles.checkoutButton}
            onPress={handleCheckout}>
            <ThemedText style={styles.checkoutButtonText}>
              {isLoggedIn ? 'Proceder al Pago' : 'Iniciar Sesión para Pagar'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cartItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  removeButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
  },
  totalContainer: {
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  checkoutButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  customizationsContainer: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  customizationText: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
});
