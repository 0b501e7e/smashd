import { ScrollView, Image, View, Animated, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { menuAPI } from '@/services/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '@/services/api';
import { ImageIcon, Plus, Minus, ShoppingCart } from 'lucide-react-native';

// RNR Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Define customization options
type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

// Define the structure for all customizations fetched from the backend
type AllCustomizations = {
  extras: CustomizationOption[];
  sauces: CustomizationOption[];
  toppings: CustomizationOption[];
};

// Define categories of customizations with unique IDs
// const EXTRAS = [
//   { id: 'extra-patty-1', name: 'Extra Patty', price: 2.00 },
//   { id: 'cheese-1', name: 'Cheese', price: 1.00 },
//   { id: 'bacon-1', name: 'Bacon', price: 1.50 },
//   { id: 'avocado-1', name: 'Avocado', price: 1.75 },
// ];

// const SAUCES = [
//   { id: 'ketchup-1', name: 'Ketchup', price: 0 },
//   { id: 'mayo-1', name: 'Mayo', price: 0 },
//   { id: 'bbq-1', name: 'BBQ Sauce', price: 0 },
//   { id: 'special-sauce-1', name: 'Special Sauce', price: 0.50 },
// ];

// const TOPPINGS = [
//   { id: 'lettuce-1', name: 'Lettuce', price: 0 },
//   { id: 'tomato-1', name: 'Tomato', price: 0 },
//   { id: 'onion-1', name: 'Onion', price: 0 },
//   { id: 'pickles-1', name: 'Pickles', price: 0 },
//   { id: 'jalapenos-1', name: 'Jalapenos', price: 0.75 },
// ];

export default function ItemCustomizationScreen() {
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customizationsLoading, setCustomizationsLoading] = useState(true);
  const [allCustomizations, setAllCustomizations] = useState<AllCustomizations | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  // Pulse animation ref (keep for footer button)
  // const pulseAnim = useRef(new Animated.Value(1)).current; // REMOVE PULSE ANIMATION

  // Calculate total price based on selections
  const calculateTotalPrice = useCallback(() => {
    let total = item ? item.price * quantity : 0;
    if (allCustomizations) {
      selectedExtras.forEach((extraId) => {
        const extra = allCustomizations.extras.find((e) => e.id === extraId);
        if (extra) total += extra.price * quantity;
      });
      selectedSauces.forEach((sauceId) => {
        const sauce = allCustomizations.sauces.find((s) => s.id === sauceId);
        if (sauce && sauce.price > 0) total += sauce.price * quantity;
      });
      selectedToppings.forEach((toppingId) => {
        const topping = allCustomizations.toppings.find((t) => t.id === toppingId);
        if (topping && topping.price > 0) total += topping.price * quantity;
      });
    }
    return total;
  }, [item, quantity, selectedExtras, selectedSauces, selectedToppings, allCustomizations]);

  useEffect(() => {
    if (itemId) {
      const itemIdNumber = Number(itemId);
      fetchMenuItem(itemIdNumber);
      fetchItemCustomizations(itemIdNumber);
    }
  }, [itemId]);

  // useEffect(() => { // REMOVE PULSE ANIMATION EFFECT
  //   // Start pulsing animation for Add to Cart button
  //   const animation = Animated.loop(
  //     Animated.sequence([
  //       Animated.timing(pulseAnim, {
  //         toValue: 1.05,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(pulseAnim, {
  //         toValue: 1,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //     ]),
  //   );
  //   animation.start();
  //   // Cleanup function to stop animation
  //   return () => animation.stop();
  // }, [pulseAnim]);

  const fetchMenuItem = async (id: number) => {
    try {
      setLoading(true);
      const data = await menuAPI.getMenuItemById(id);
      setItem(data);
    } catch (error) {
      console.error("Error fetching menu item:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemCustomizations = async (id: number) => {
    try {
      setCustomizationsLoading(true);
      const data = await menuAPI.getItemCustomizations(id);
      // Ensure all expected keys exist, even if the API returns an empty object or partial data
      setAllCustomizations({
        extras: data.extras || [],
        sauces: data.sauces || [],
        toppings: data.toppings || [],
      });
    } catch (error) {
      console.error("Error fetching item customizations:", error);
      setAllCustomizations({ extras: [], sauces: [], toppings: [] });
    } finally {
      setCustomizationsLoading(false);
    }
  };

  const baseApiUrl = API_URL?.replace(/\/(v1|api)$/, "");
  const imageUri =
    item?.imageUrl && baseApiUrl ? `${baseApiUrl}${item.imageUrl}` : null;

  const toggleSelection = (
    id: string,
    currentSelected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    Haptics.selectionAsync();
    if (currentSelected.includes(id)) {
      setSelected(currentSelected.filter((item) => item !== id));
    } else {
      setSelected([...currentSelected, id]);
    }
  };

  const handleAddToCart = useCallback(() => {
    if (!item || addingToCart || !allCustomizations) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddingToCart(true);

    try {
      const customizations = {
        extras: selectedExtras
          .map((id) => allCustomizations.extras.find((e) => e.id === id)?.name)
          .filter(Boolean) as string[],
        sauces: selectedSauces
          .map((id) => allCustomizations.sauces.find((s) => s.id === id)?.name)
          .filter(Boolean) as string[],
        toppings: selectedToppings
          .map((id) => allCustomizations.toppings.find((t) => t.id === id)?.name)
          .filter(Boolean) as string[],
      };

      addItem({
        id: item.id,
        name: item.name,
        price: calculateTotalPrice() / quantity, // Price per item with customizations
        quantity,
        customizations,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();

    } catch (error) {
      console.error("Error adding item to cart:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAddingToCart(false);
    }
  }, [
    item,
    addingToCart,
    selectedExtras,
    selectedSauces,
    selectedToppings,
    quantity,
    addItem,
    router,
    calculateTotalPrice,
    allCustomizations,
  ]);

  // Function to render customization sections
  const renderCustomizationSection = (
    title: string,
    options: CustomizationOption[],
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => (
    <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
      <CardHeader>
        <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
          {title}
        </Text>
      </CardHeader>
      <CardContent className="pt-0">
        <View className="flex-wrap flex-row gap-2">
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <Button
                key={option.id}
                className={`h-10 ${isSelected ? '' : 'border'}`}
                style={{
                  backgroundColor: isSelected ? '#FAB10A' : 'transparent',
                  borderColor: isSelected ? '#FAB10A' : '#333333',
                }}
                onPress={() => toggleSelection(option.id, selected, setSelected)}
              >
                <Text
                  className="font-medium text-sm"
                  style={{ color: isSelected ? '#000000' : '#FFFFFF' }}
                >
                  {option.name}{" "}
                  {option.price > 0 && `(€${option.price.toFixed(2)})`}
                </Text>
              </Button>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );

  if (loading || customizationsLoading || !item || !allCustomizations) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FAB10A" className="mb-4" />
          <Text className="text-lg font-medium" style={{ color: '#FFFFFF' }}>
            Cargando detalles del producto...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate total price for display
  const totalPrice = calculateTotalPrice();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
      <Stack.Screen
        options={{
          title: item.name,
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF' },
        }}
      />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Header Section */}
        <View className="relative mb-6">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-64"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-64 justify-center items-center" style={{ backgroundColor: '#111111' }}>
              <ImageIcon size={40} color="#666666" />
            </View>
          )}
          <View className="absolute inset-x-0 bottom-0 p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
            <Text className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              {item.name}
            </Text>
            <Text
              className="text-sm leading-5"
              style={{ color: '#CCCCCC' }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.description}
            </Text>
          </View>
        </View>

        <View className="px-6">
          {/* Price Section */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-4">
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Precio base: 
                <Text style={{ color: '#FAB10A' }}> €{item.price.toFixed(2)}</Text>
              </Text>
            </CardContent>
          </Card>
          
          {/* Customization Sections */}
          {allCustomizations && allCustomizations.extras.length > 0 && renderCustomizationSection(
            "Extras",
            allCustomizations.extras,
            selectedExtras,
            setSelectedExtras,
          )}
          {allCustomizations && allCustomizations.sauces.length > 0 && renderCustomizationSection(
            "Salsas",
            allCustomizations.sauces,
            selectedSauces,
            setSelectedSauces,
          )}
          {allCustomizations && allCustomizations.toppings.length > 0 && renderCustomizationSection(
            "Ingredientes",
            allCustomizations.toppings,
            selectedToppings,
            setSelectedToppings,
          )}
        </View>
      </ScrollView>

      {/* Fixed Footer Section */}
      <View 
        className="px-6 pt-4" 
        style={{ 
          backgroundColor: '#000000', 
          borderTopWidth: 1, 
          borderTopColor: '#333333',
          paddingBottom: Math.max(insets.bottom + 8, 16)
        }}
      >
        {/* Quantity Controls */}
        <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between"> 
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Cantidad
              </Text>
              <View className="flex-row items-center gap-3">
                <Button
                  className={`w-10 h-10 rounded-full border ${quantity <= 1 ? 'opacity-50' : ''}`}
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: '#FAB10A'
                  }}
                  disabled={quantity <= 1}
                  onPress={() => {
                    if (quantity > 1) {
                      setQuantity(quantity - 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Minus size={16} color="#FAB10A" />
                </Button>
                
                <Badge style={{ backgroundColor: '#FAB10A', minWidth: 40 }}>
                  <Text className="text-lg font-bold" style={{ color: '#000000' }}>
                    {quantity}
                  </Text>
                </Badge>
                
                <Button
                  className="w-10 h-10 rounded-full border"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: '#FAB10A'
                  }}
                  onPress={() => {
                    setQuantity(quantity + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Plus size={16} color="#FAB10A" />
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Add to Cart Button */}
        <Button
          className="w-full h-14"
          style={{ backgroundColor: '#FAB10A' }}
          onPress={handleAddToCart}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View className="flex-row items-center gap-2">
              <ShoppingCart size={20} color="#000000" />
              <Text className="text-lg font-bold" style={{ color: '#000000' }}>
                Añadir {quantity} al Carrito - €{totalPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
} 