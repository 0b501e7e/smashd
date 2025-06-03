import { ActivityIndicator, View, Pressable } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { menuAPI } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  description: string;
  category: 'BURGER' | 'SIDE' | 'DRINK';
  imageUrl: string;
};

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await menuAPI.getMenu();
      setMenuItems(data);
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
  };

  const handleItemPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/item-customization',
      params: { itemId: item.id },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-black" style={{ paddingTop: insets.top }}>
        <Text className="text-white">{error}</Text>
      </View>
    );
  }

  const categories = ['BURGER', 'SIDE', 'DRINK'] as const;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: 'black', dark: 'black' }}
      headerImage={
        <View className="h-full justify-center items-center bg-black">
          <Text className="text-4xl font-bold text-center p-5 leading-tight h-24 text-yellow-400">
            Our Menu
          </Text>
        </View>
      }>
      <View className="bg-black" style={{ paddingBottom: insets.bottom + 20 }}>
        {categories.map((category) => (
          <View key={category} className="mb-5">
            <Text className="text-2xl font-bold mb-2.5 text-yellow-400">
              {category}s
            </Text>
            {menuItems
              .filter((item) => item.category === category)
              .map((item) => (
                <Card key={item.id} className="mb-2.5 bg-zinc-900 border-zinc-700">
                  <Pressable onPress={() => handleItemPress(item)}>
                    <CardHeader>
                      <CardTitle className="text-white">{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Text className="mb-1 text-white">${item.price.toFixed(2)}</Text>
                      <CardDescription className="text-gray-300">{item.description}</CardDescription>
                    </CardContent>
                  </Pressable>
                  <CardFooter>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-yellow-400 hover:bg-yellow-500"
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text className="text-black font-semibold">Add to Cart</Text>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </View>
        ))}
      </View>
    </ParallaxScrollView>
  );
} 