import { StyleSheet, ScrollView, Image, View, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback, useRef } from 'react';
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

// Define categories of customizations with unique IDs
const EXTRAS = [
  { id: 'extra-patty-1', name: 'Extra Patty', price: 2.00 },
  { id: 'cheese-1', name: 'Cheese', price: 1.00 },
  { id: 'bacon-1', name: 'Bacon', price: 1.50 },
  { id: 'avocado-1', name: 'Avocado', price: 1.75 },
];

const SAUCES = [
  { id: 'ketchup-1', name: 'Ketchup', price: 0 },
  { id: 'mayo-1', name: 'Mayo', price: 0 },
  { id: 'bbq-1', name: 'BBQ Sauce', price: 0 },
  { id: 'special-sauce-1', name: 'Special Sauce', price: 0.50 },
];

const TOPPINGS = [
  { id: 'lettuce-1', name: 'Lettuce', price: 0 },
  { id: 'tomato-1', name: 'Tomato', price: 0 },
  { id: 'onion-1', name: 'Onion', price: 0 },
  { id: 'pickles-1', name: 'Pickles', price: 0 },
  { id: 'jalapenos-1', name: 'Jalapenos', price: 0.75 },
];

export default function ItemCustomizationScreen() {
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['ketchup-1', 'mayo-1']);
  const [selectedToppings, setSelectedToppings] = useState<string[]>(['lettuce-1', 'tomato-1', 'onion-1']);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();
  
  // Add pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
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

  useEffect(() => {
    // Start pulsing animation for Add to Cart button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const handleAddToCart = useCallback(() => {
    if (!item || addingToCart) return;
    
    // Provide haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Set loading state
    setAddingToCart(true);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      try {
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
        
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Navigate back
        router.back();
      } catch (error) {
        console.error('Error adding item to cart:', error);
        
        // Error haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Reset loading state in case of error
        setAddingToCart(false);
      }
    }, 300); // Short delay for feedback
  }, [item, addingToCart, selectedExtras, selectedSauces, selectedToppings, quantity, addItem, router]);

  if (loading || !item) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading item details...</ThemedText>
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
      
      {/* Main content container with proper flex layout */}
      <ThemedView style={styles.mainContainer}>
        {/* Scrollable content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          contentInsetAdjustmentBehavior="automatic"
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
                      <View style={styles.optionInfo}>
                        <ThemedText>{extra.name}</ThemedText>
                        {extra.price > 0 && (
                          <ThemedText style={styles.optionPrice}>+${extra.price.toFixed(2)}</ThemedText>
                        )}
                      </View>
                      {selectedExtras.includes(extra.id) && (
                        <IconSymbol name="checkmark" size={20} color="#ff8c00" />
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
                      <View style={styles.optionInfo}>
                        <ThemedText>{sauce.name}</ThemedText>
                        {sauce.price > 0 && (
                          <ThemedText style={styles.optionPrice}>+${sauce.price.toFixed(2)}</ThemedText>
                        )}
                      </View>
                      {selectedSauces.includes(sauce.id) && (
                        <IconSymbol name="checkmark" size={20} color="#ff8c00" />
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
                      <View style={styles.optionInfo}>
                        <ThemedText>{topping.name}</ThemedText>
                        {topping.price > 0 && (
                          <ThemedText style={styles.optionPrice}>+${topping.price.toFixed(2)}</ThemedText>
                        )}
                      </View>
                      {selectedToppings.includes(topping.id) && (
                        <IconSymbol name="checkmark" size={20} color="#ff8c00" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </>
            )}
            
            {/* Add a summary at the bottom of scrollable content */}
            <View style={styles.summaryContainer}>
              <ThemedText style={styles.summaryTitle}>Order Summary</ThemedText>
              <View style={styles.summaryRow}>
                <ThemedText>{item.name} ({quantity})</ThemedText>
                <ThemedText>${(item.price * quantity).toFixed(2)}</ThemedText>
              </View>
              
              {selectedExtras.length > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText>Extras:</ThemedText>
                  <ThemedText>
                    ${selectedExtras.reduce((total, id) => {
                      const extra = EXTRAS.find(e => e.id === id);
                      return total + (extra?.price || 0) * quantity;
                    }, 0).toFixed(2)}
                  </ThemedText>
                </View>
              )}
              
              {selectedSauces.filter(id => {
                const sauce = SAUCES.find(s => s.id === id);
                return sauce && sauce.price > 0;
              }).length > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText>Premium Sauces:</ThemedText>
                  <ThemedText>
                    ${selectedSauces.reduce((total, id) => {
                      const sauce = SAUCES.find(s => s.id === id);
                      return total + ((sauce?.price || 0) > 0 ? (sauce?.price || 0) * quantity : 0);
                    }, 0).toFixed(2)}
                  </ThemedText>
                </View>
              )}
              
              {selectedToppings.filter(id => {
                const topping = TOPPINGS.find(t => t.id === id);
                return topping && topping.price > 0;
              }).length > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText>Premium Toppings:</ThemedText>
                  <ThemedText>
                    ${selectedToppings.reduce((total, id) => {
                      const topping = TOPPINGS.find(t => t.id === id);
                      return total + ((topping?.price || 0) > 0 ? (topping?.price || 0) * quantity : 0);
                    }, 0).toFixed(2)}
                  </ThemedText>
                </View>
              )}
              
              <View style={styles.summaryTotal}>
                <ThemedText style={styles.totalLabelInline}>Total:</ThemedText>
                <ThemedText style={styles.totalPriceInline}>${calculateTotalPrice().toFixed(2)}</ThemedText>
              </View>
            </View>
            
            {/* Add to Cart Button */}
            <ThemedView style={styles.scrollAddToCartContainer}>
              <Animated.View 
                style={{ 
                  transform: [{ scale: !addingToCart ? pulseAnim : 1 }], 
                  width: '100%' 
                }}
              >
                <TouchableOpacity
                  style={[styles.scrollAddButton, addingToCart && styles.disabledButton]}
                  onPress={handleAddToCart}
                  activeOpacity={0.7}
                  disabled={addingToCart}
                >
                  <ThemedView style={styles.addButtonContent}>
                    <ThemedText style={styles.addButtonText}>
                      {addingToCart ? 'ADDING TO CART...' : 'ADD TO CART'}
                    </ThemedText>
                    {!addingToCart && (
                      <IconSymbol name="cart.fill.badge.plus" size={28} color="#ffffff" />
                    )}
                  </ThemedView>
                </TouchableOpacity>
              </Animated.View>
            </ThemedView>
            
            {/* Extra padding at the bottom */}
            <View style={[styles.bottomPadding, { paddingBottom: Math.max(insets.bottom + 30, 50) }]} />
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
    flexGrow: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
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
    backgroundColor: '#ffaf1c',
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
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderColor: '#ff8c00',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionPrice: {
    color: '#ff8c00',
    fontWeight: 'bold',
  },
  // Summary section styles
  summaryContainer: {
    padding: 16,
    marginTop: 16,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#ff8c00',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  totalLabelInline: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPriceInline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  bottomPadding: {
    height: 30,
  },
  scrollAddToCartContainer: {
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 40,
  },
  scrollAddButton: {
    backgroundColor: '#ff8c00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 1,
    textTransform: 'uppercase',
    backgroundColor: 'transparent',
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
}); 