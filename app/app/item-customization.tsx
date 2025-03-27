import { StyleSheet, ScrollView, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import React from 'react';
import { menuAPI } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Define customization options
type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

// Define categories of customizations
const EXTRAS = [
  { id: 'extra-patty', name: 'Extra Patty', price: 2.00 },
  { id: 'cheese', name: 'Cheese', price: 1.00 },
  { id: 'bacon', name: 'Bacon', price: 1.50 },
  { id: 'avocado', name: 'Avocado', price: 1.75 },
];

const SAUCES = [
  { id: 'ketchup', name: 'Ketchup', price: 0 },
  { id: 'mayo', name: 'Mayo', price: 0 },
  { id: 'bbq', name: 'BBQ Sauce', price: 0 },
  { id: 'special-sauce', name: 'Special Sauce', price: 0.50 },
];

const TOPPINGS = [
  { id: 'lettuce', name: 'Lettuce', price: 0 },
  { id: 'tomato', name: 'Tomato', price: 0 },
  { id: 'onion', name: 'Onion', price: 0 },
  { id: 'pickles', name: 'Pickles', price: 0 },
  { id: 'jalapenos', name: 'Jalapenos', price: 0.75 },
];

export default function ItemCustomizationScreen() {
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['ketchup', 'mayo']);
  const [selectedToppings, setSelectedToppings] = useState<string[]>(['lettuce', 'tomato', 'onion']);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  // Calculate total price based on selections
  const calculateTotalPrice = () => {
    let total = item ? item.price * quantity : 0;
    
    // Add extras
    selectedExtras.forEach(extraId => {
      const extra = EXTRAS.find(e => e.id === extraId);
      if (extra) {
        total += extra.price * quantity;
      }
    });
    
    // Add sauces with price
    selectedSauces.forEach(sauceId => {
      const sauce = SAUCES.find(s => s.id === sauceId);
      if (sauce && sauce.price > 0) {
        total += sauce.price * quantity;
      }
    });
    
    // Add toppings with price
    selectedToppings.forEach(toppingId => {
      const topping = TOPPINGS.find(t => t.id === toppingId);
      if (topping && topping.price > 0) {
        total += topping.price * quantity;
      }
    });
    
    return total;
  };

  useEffect(() => {
    if (itemId) {
      fetchMenuItem(Number(itemId));
    }
  }, [itemId]);

  const fetchMenuItem = async (id: number) => {
    try {
      setLoading(true);
      const data = await menuAPI.getMenuItemById(id);
      setItem(data);
    } catch (error) {
      console.error('Error fetching menu item:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string, currentSelected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentSelected.includes(id)) {
      setSelected(currentSelected.filter(item => item !== id));
    } else {
      setSelected([...currentSelected, id]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddToCart = () => {
    if (!item) return;
    
    const customizations = {
      extras: selectedExtras.map(id => EXTRAS.find(e => e.id === id)?.name).filter(Boolean) as string[],
      sauces: selectedSauces.map(id => SAUCES.find(s => s.id === id)?.name).filter(Boolean) as string[],
      toppings: selectedToppings.map(id => TOPPINGS.find(t => t.id === id)?.name).filter(Boolean) as string[],
    };
    
    addItem({
      id: item.id,
      name: item.name,
      price: calculateTotalPrice() / quantity, // Price per item with customizations
      quantity,
      customizations
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (loading || !item) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: item.name,
          headerShown: true,
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <ThemedView style={styles.contentContainer}>
          <ThemedView style={styles.itemHeader}>
            {item.imageUrl && (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.itemImage} 
                resizeMode="cover"
              />
            )}
            <ThemedView style={styles.itemInfo}>
              <ThemedText type="subtitle" style={styles.itemName}>{item.name}</ThemedText>
              <ThemedText style={styles.itemDescription}>{item.description}</ThemedText>
              <ThemedText style={styles.basePrice}>Base price: ${item.price.toFixed(2)}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Quantity</ThemedText>
            <ThemedView style={styles.quantitySelector}>
              <TouchableOpacity
                style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                disabled={quantity <= 1}
                onPress={() => {
                  if (quantity > 1) {
                    setQuantity(quantity - 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <ThemedText style={styles.quantityButtonText}>-</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => {
                  setQuantity(quantity + 1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ThemedText style={styles.quantityButtonText}>+</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {item.category === 'BURGER' && (
            <>
              <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Extras</ThemedText>
                {EXTRAS.map(extra => (
                  <TouchableOpacity
                    key={extra.id}
                    style={[
                      styles.optionItem,
                      selectedExtras.includes(extra.id) && styles.optionItemSelected
                    ]}
                    onPress={() => toggleSelection(extra.id, selectedExtras, setSelectedExtras)}
                  >
                    <ThemedView style={styles.optionInfo}>
                      <ThemedText>{extra.name}</ThemedText>
                      {extra.price > 0 && (
                        <ThemedText style={styles.optionPrice}>+${extra.price.toFixed(2)}</ThemedText>
                      )}
                    </ThemedView>
                    {selectedExtras.includes(extra.id) && (
                      <IconSymbol name="chevron.right" size={20} color="#0a7ea4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ThemedView>

              <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Sauces</ThemedText>
                {SAUCES.map(sauce => (
                  <TouchableOpacity
                    key={sauce.id}
                    style={[
                      styles.optionItem,
                      selectedSauces.includes(sauce.id) && styles.optionItemSelected
                    ]}
                    onPress={() => toggleSelection(sauce.id, selectedSauces, setSelectedSauces)}
                  >
                    <ThemedView style={styles.optionInfo}>
                      <ThemedText>{sauce.name}</ThemedText>
                      {sauce.price > 0 && (
                        <ThemedText style={styles.optionPrice}>+${sauce.price.toFixed(2)}</ThemedText>
                      )}
                    </ThemedView>
                    {selectedSauces.includes(sauce.id) && (
                      <IconSymbol name="chevron.right" size={20} color="#0a7ea4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ThemedView>

              <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Toppings</ThemedText>
                {TOPPINGS.map(topping => (
                  <TouchableOpacity
                    key={topping.id}
                    style={[
                      styles.optionItem,
                      selectedToppings.includes(topping.id) && styles.optionItemSelected
                    ]}
                    onPress={() => toggleSelection(topping.id, selectedToppings, setSelectedToppings)}
                  >
                    <ThemedView style={styles.optionInfo}>
                      <ThemedText>{topping.name}</ThemedText>
                      {topping.price > 0 && (
                        <ThemedText style={styles.optionPrice}>+${topping.price.toFixed(2)}</ThemedText>
                      )}
                    </ThemedView>
                    {selectedToppings.includes(topping.id) && (
                      <IconSymbol name="chevron.right" size={20} color="#0a7ea4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </>
          )}
        </ThemedView>
      </ScrollView>

      <ThemedView style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ThemedView style={styles.footerContent}>
          <ThemedView style={styles.totalContainer}>
            <ThemedText style={styles.totalLabel}>Total:</ThemedText>
            <ThemedText style={styles.totalPrice}>${calculateTotalPrice().toFixed(2)}</ThemedText>
          </ThemedView>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddToCart}
          >
            <ThemedText style={styles.addButtonText}>ADD TO CART</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemHeader: {
    padding: 16,
    marginTop: 8,
  },
  itemImage: {
    height: 200,
    width: '100%',
    borderRadius: 8,
    marginBottom: 12,
  },
  itemInfo: {
    gap: 8,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 16,
    marginBottom: 8,
  },
  basePrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#ccc',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderColor: '#0a7ea4',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionPrice: {
    color: '#0a7ea4',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  footerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    width: '100%',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
}); 