import { ScrollView, Image, View, Animated, ActivityIndicator, Platform, TouchableOpacity, Dimensions } from 'react-native';
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
import { AllCustomizations, CustomizationOption } from '@/types';

// RNR Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const { width } = Dimensions.get('window');

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category: string;
}

export default function ItemCustomization() {
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customizationsLoading, setCustomizationsLoading] = useState(true);
  const [allCustomizations, setAllCustomizations] = useState<AllCustomizations | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<number[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<number[]>([]);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  // Pulse animation ref (keep for footer button)
  // const pulseAnim = useRef(new Animated.Value(1)).current; // REMOVE PULSE ANIMATION

  // Calculate total price based on selections
  const calculateTotalPrice = useCallback(() => {
    let total = item ? (item.price || 0) * quantity : 0;
    if (allCustomizations) {
      selectedExtras.forEach((extraId) => {
        const extra = allCustomizations.extras.find((e) => e.id === extraId);
        if (extra) total += (extra.price || 0) * quantity;
      });
      selectedSauces.forEach((sauceId) => {
        const sauce = allCustomizations.sauces.find((s) => s.id === sauceId);
        if (sauce && (sauce.price || 0) > 0) total += (sauce.price || 0) * quantity;
      });
      selectedToppings.forEach((toppingId) => {
        const topping = allCustomizations.toppings.find((t) => t.id === toppingId);
        if (topping && (topping.price || 0) > 0) total += (topping.price || 0) * quantity;
      });
    }
    return total;
  }, [item, quantity, selectedExtras, selectedSauces, selectedToppings, allCustomizations]);

  useEffect(() => {
    // Define the async fetching function right inside the effect
    const fetchAllData = async (id: number) => {
      try {
        setLoading(true);
        setCustomizationsLoading(true);

        // Fetch item details and customizations in parallel for better performance
        const [itemData, customizationsData] = await Promise.all([
          menuAPI.getMenuItemById(id),
          menuAPI.getItemCustomizations(id) as any,
        ]);

        setItem(itemData);
        setAllCustomizations({
          extras: customizationsData.Extras || [],
          sauces: customizationsData.Sauces || [],
          toppings: customizationsData.Toppings || [],
        });

      } catch (error) {
        console.error("Error fetching item details:", error);
        // Ensure we don't have a broken UI on error
        setAllCustomizations({ extras: [], sauces: [], toppings: [] });
      } finally {
        setLoading(false);
        setCustomizationsLoading(false);
      }
    };

    if (itemId) {
      const itemIdNumber = Number(itemId);
      fetchAllData(itemIdNumber);
    }
    // The ONLY dependency is itemId. The fetch function is created and used
    // within this effect, so it doesn't need to be a dependency.
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

  const baseApiUrl = API_URL?.replace(/\/(v1|api)$/, "");
  const imageUri =
    item?.imageUrl && baseApiUrl ? `${baseApiUrl}${item.imageUrl}` : null;

  const toggleSelection = (
    id: number,
    currentSelected: number[],
    setSelected: React.Dispatch<React.SetStateAction<number[]>>,
  ) => {
    console.log(`--- Tapped Customization Option --- ID: ${id}, Type: ${typeof id}`);
    Haptics.selectionAsync();
    if (currentSelected.includes(id)) {
      console.log(`DE-selecting ${id}`);
      setSelected(currentSelected.filter((item) => item !== id));
    } else {
      console.log(`SELECTING ${id}`);
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
    selected: number[],
    setSelected: React.Dispatch<React.SetStateAction<number[]>>,
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
            const optionId = typeof option.id === 'number' ? option.id : parseInt(option.id.toString());
            const isSelected = selected.includes(optionId);
            return (
              <TouchableOpacity
                key={option.id}
                className={`h-10 px-4 py-2 flex items-center justify-center rounded-md ${isSelected ? '' : 'border'}`}
                style={{
                  backgroundColor: isSelected ? '#FAB10A' : 'transparent',
                  borderColor: isSelected ? '#FAB10A' : '#333333',
                }}
                onPress={() => toggleSelection(optionId, selected, setSelected)}
                activeOpacity={0.7}
              >
                <Text
                  className="font-medium text-sm"
                  style={{ color: isSelected ? '#000000' : '#FFFFFF' }}
                >
                  {option.name}{" "}
                  {option.price > 0 && `(€${(option.price || 0).toFixed(2)})`}
                </Text>
              </TouchableOpacity>
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
        keyboardShouldPersistTaps="handled"
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
                <Text style={{ color: '#FAB10A' }}> €{(item?.price || 0).toFixed(2)}</Text>
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