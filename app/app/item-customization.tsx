import { ScrollView, Image, View, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
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

export default function ItemCustomization() {
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allCustomizations, setAllCustomizations] = useState<AllCustomizations | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<{[key: number]: boolean}>({});
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  // Single function to calculate total price
  const getTotalPrice = () => {
    let total = (item?.price || 0) * quantity;

    if (allCustomizations) {
      // Add prices from selected customizations
      [...allCustomizations.extras, ...allCustomizations.sauces, ...allCustomizations.toppings]
        .filter(option => selectedCustomizations[Number(option.id)])
        .forEach(option => total += (option.price || 0) * quantity);
    }
    
    return total;
  };

  // Fetch item data
  useEffect(() => {
    if (!itemId) return;
    
    const fetchData = async () => {
      try {
        const [itemData, customizationsData] = await Promise.all([
          menuAPI.getMenuItemById(Number(itemId)),
          menuAPI.getItemCustomizations(Number(itemId)) as any,
        ]);

        setItem(itemData);
        // API service now handles the response transformation
        setAllCustomizations({
          extras: customizationsData.extras || [],
          sauces: customizationsData.sauces || [],
          toppings: customizationsData.toppings || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setAllCustomizations({ extras: [], sauces: [], toppings: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId]);

  // Toggle customization selection
  const toggleCustomization = (id: number) => {
    Haptics.selectionAsync();
    setSelectedCustomizations(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add to cart handler
  const handleAddToCart = () => {
    if (!item || !allCustomizations) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get selected customization names by category
    const getSelectedNames = (options: CustomizationOption[]) =>
      options.filter(option => selectedCustomizations[Number(option.id)]).map(option => option.name);

      const customizations = {
      extras: getSelectedNames(allCustomizations.extras),
      sauces: getSelectedNames(allCustomizations.sauces),
      toppings: getSelectedNames(allCustomizations.toppings),
      };

      addItem({
        id: item.id,
        name: item.name,
      price: getTotalPrice() / quantity, // Price per item with customizations
        quantity,
        customizations,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
  };

  // Render customization category
  const CustomizationCategory = ({ title, options }: { title: string; options: CustomizationOption[] }) => {
    if (options.length === 0) return null;
    
    return (
    <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
      <CardHeader>
        <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
          {title}
        </Text>
      </CardHeader>
      <CardContent className="pt-0">
        <View className="flex-wrap flex-row gap-2">
          {options.map((option) => {
              const optionId = Number(option.id);
              const isSelected = selectedCustomizations[optionId];
              
            return (
              <TouchableOpacity
                key={option.id}
                className={`h-10 px-4 py-2 flex items-center justify-center rounded-md ${isSelected ? '' : 'border'}`}
                style={{
                  backgroundColor: isSelected ? '#FAB10A' : 'transparent',
                  borderColor: isSelected ? '#FAB10A' : '#333333',
                }}
                  onPress={() => toggleCustomization(optionId)}
                activeOpacity={0.7}
              >
                <Text
                  className="font-medium text-sm"
                  style={{ color: isSelected ? '#000000' : '#FFFFFF' }}
                >
                    {option.name}
                    {option.price > 0 && ` (+€${option.price.toFixed(2)})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );
  };

  // Loading state
  if (loading || !item || !allCustomizations) {
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

  const imageUri = item?.imageUrl && API_URL ? 
    `${API_URL.replace(/\/(v1|api)$/, "")}${item.imageUrl}` : null;

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
        {/* Item Header */}
        <View className="relative mb-6">
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="w-full h-64" resizeMode="cover" />
          ) : (
            <View className="w-full h-64 justify-center items-center" style={{ backgroundColor: '#111111' }}>
              <ImageIcon size={40} color="#666666" />
            </View>
          )}
          <View className="absolute inset-x-0 bottom-0 p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
            <Text className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              {item.name}
            </Text>
            {item.description && (
              <Text className="text-sm leading-5" style={{ color: '#CCCCCC' }} numberOfLines={2}>
              {item.description}
            </Text>
            )}
          </View>
        </View>

        <View className="px-6">
          {/* Base Price */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-4">
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Precio base: <Text style={{ color: '#FAB10A' }}>€{(item.price || 0).toFixed(2)}</Text>
              </Text>
            </CardContent>
          </Card>
          
          {/* Customizations */}
          <CustomizationCategory title="Extras" options={allCustomizations.extras} />
          <CustomizationCategory title="Salsas" options={allCustomizations.sauces} />
          <CustomizationCategory title="Ingredientes" options={allCustomizations.toppings} />
        </View>
      </ScrollView>

      {/* Footer */}
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
                  style={{ backgroundColor: 'transparent', borderColor: '#FAB10A' }}
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
                  style={{ backgroundColor: 'transparent', borderColor: '#FAB10A' }}
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
        >
            <View className="flex-row items-center gap-2">
              <ShoppingCart size={20} color="#000000" />
              <Text className="text-lg font-bold" style={{ color: '#000000' }}>
              Añadir {quantity} al Carrito - €{getTotalPrice().toFixed(2)}
              </Text>
            </View>
        </Button>
      </View>
    </SafeAreaView>
  );
} 