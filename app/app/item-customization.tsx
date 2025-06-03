import { ScrollView, Image, View, Animated, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { menuAPI } from '@/services/api';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { API_URL } from '@/services/api';
import { Button } from '@/components/ui/button';

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
    <View className="px-4 mb-6">
      <Text className="text-white text-xl font-semibold mb-3">{title}</Text>
      <View className="flex-wrap flex-row gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <Button
              key={option.id}
              variant={isSelected ? "default" : "outline"}
              size="default"
              className={`
                ${isSelected ? "bg-yellow-400 border-yellow-400" : "border-zinc-600"}
              `}
              onPress={() => toggleSelection(option.id, selected, setSelected)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                className={`font-medium ${isSelected ? "text-black" : "text-black"}`}
              >
                {option.name}{" "}
                {option.price > 0 && `($${option.price.toFixed(2)})`}
              </Text>
            </Button>
          );
        })}
      </View>
    </View>
  );

  if (loading || customizationsLoading || !item || !allCustomizations) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white mt-2">Loading item details...</Text>
      </SafeAreaView>
    );
  }

  // Calculate total price for display
  const totalPrice = calculateTotalPrice();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerTitle: item.name,
          headerShown: true,
          headerStyle: { backgroundColor: "black" },
          headerTintColor: "white",
          headerTitleStyle: { color: "white" },
        }}
      />
      
      <ScrollView
        className="flex-1" // Takes up available space above the footer
        contentContainerStyle={{ paddingBottom: 20 }} // Padding for end of scroll content
        showsVerticalScrollIndicator={false}
      >
        {/* Item Header Section */}
        <View className="relative mb-4">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-64"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-64 bg-zinc-800 justify-center items-center">
              <IconSymbol name="photo" size={40} color="#999" />
            </View>
          )}
          <View className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent"> 
            <Text className="text-white text-2xl font-bold mb-1">
              {item.name}
            </Text>
            <Text
              className="text-gray-300 text-sm"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.description}
            </Text>
          </View>
        </View>

        {/* Price Section */}
        <View className="px-4 mb-6">
          <Text className="text-white text-lg">
            Base price: ${item.price.toFixed(2)}
          </Text>
        </View>
        
        {/* Customization Sections */}
        {allCustomizations && allCustomizations.extras.length > 0 && renderCustomizationSection(
          "Extras",
          allCustomizations.extras,
          selectedExtras,
          setSelectedExtras,
        )}
        {allCustomizations && allCustomizations.sauces.length > 0 && renderCustomizationSection(
          "Sauces",
          allCustomizations.sauces,
          selectedSauces,
          setSelectedSauces,
        )}
        {allCustomizations && allCustomizations.toppings.length > 0 && renderCustomizationSection(
          "Toppings",
          allCustomizations.toppings,
          selectedToppings,
          setSelectedToppings,
        )}

      </ScrollView>

      {/* --- Footer Section (Fixed at bottom relative to parent View) --- */}
      <View 
        className="px-4 border-t border-zinc-700 pt-4 bg-black" 
        // Use paddingBottom from safe area insets
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 15 }} // Add a base padding even without inset
      >
        {/* Quantity Controls */}
        <View className="flex-row items-center justify-between mb-4"> 
          <Text className="text-white text-lg font-semibold">
            Quantity
          </Text>
          <View className="flex-row items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className={`border-yellow-400 rounded-full h-9 w-9 ${quantity <= 1 ? "opacity-50" : ""}`}
              disabled={quantity <= 1}
              onPress={() => {
                if (quantity > 1) {
                  setQuantity(quantity - 1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <Text className="text-yellow-400 text-2xl font-bold">-</Text> 
            </Button>
            <Text className="text-white text-xl font-semibold w-10 text-center">
              {quantity}
            </Text>
            <Button
              variant="outline"
              size="icon"
              className="border-yellow-400 rounded-full h-9 w-9"
              onPress={() => {
                setQuantity(quantity + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text className="text-yellow-400 text-2xl font-bold">+</Text>
            </Button>
          </View>
        </View>

        {/* Add to Cart Button */}
        <Button
          variant="default"
          size="lg"
          className="w-full bg-yellow-400" 
          onPress={handleAddToCart}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text className="text-black text-lg font-bold">
              Add {quantity} to Cart - ${totalPrice.toFixed(2)}
            </Text>
          )}
        </Button>
      </View>
      {/* --- End Footer Section --- */}
      
    </SafeAreaView>
  );
} 