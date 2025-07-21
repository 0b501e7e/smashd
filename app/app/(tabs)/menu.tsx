import { ActivityIndicator, View, Pressable, Image, ScrollView, FlatList, Dimensions } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { menuAPI, API_URL } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChefHat, Coffee, Utensils, Plus, ShoppingCart } from 'lucide-react-native';

// RNR Components
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
import { Badge } from '@/components/ui/badge';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  description: string;
  category: 'BURGER' | 'SIDE' | 'DRINK';
  imageUrl: string;
};

const CATEGORY_CONFIG = {
  BURGER: {
    title: 'HAMBURGUESAS',
    icon: ChefHat,
    color: '#FAB10A',
  },
  SIDE: {
    title: 'ACOMPAÑAMIENTOS', 
    icon: Utensils,
    color: '#FAB10A',
  },
  DRINK: {
    title: 'BEBIDAS',
    icon: Coffee,
    color: '#FAB10A',
  },
};

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth * 0.75; // Card size that allows peek of next card

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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000', paddingTop: insets.top }}>
        <Card className="p-6 items-center" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <ActivityIndicator size="large" color="#FAB10A" className="mb-4" />
          <Text className="text-lg font-medium" style={{ color: '#FFFFFF' }}>
            Cargando carta...
          </Text>
        </Card>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: '#000000', paddingTop: insets.top }}>
        <Card className="w-full max-w-sm" style={{ backgroundColor: '#111111', borderColor: '#ff4444' }}>
          <CardContent className="p-6 items-center">
            <ChefHat size={48} color="#ff4444" className="mb-4" />
            <Text className="text-center text-lg font-medium mb-4" style={{ color: '#FFFFFF' }}>
              Error al cargar la carta
            </Text>
            <Button 
              onPress={loadMenu}
              className="w-full"
              style={{ backgroundColor: '#FAB10A' }}
            >
              <Text className="font-semibold" style={{ color: '#000000' }}>
                Reintentar
              </Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  const categories = ['BURGER', 'SIDE', 'DRINK'] as const;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#000000', dark: '#000000' }}
      headerImage={
        <View className="h-full justify-center items-center" style={{ backgroundColor: '#000000' }}>
          <View className="items-center">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FAB10A' }}>
              <ChefHat size={32} color="#000000" />
            </View>
            <Text className="text-4xl font-bold text-center px-5 leading-tight" style={{ color: '#FFFFFF' }}>
              Nuestra Carta
            </Text>
            <Text className="text-lg mt-2 opacity-80" style={{ color: '#CCCCCC' }}>
              Sabores únicos te esperan
            </Text>
          </View>
        </View>
      }>
      <View style={{ backgroundColor: '#000000', paddingBottom: insets.bottom + 20 }}>
        {categories.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const categoryItems = menuItems.filter((item) => item.category === category);
          
          if (categoryItems.length === 0) return null;

          return (
            <View key={category} className="mb-8">
              {/* Category Header */}
              <View className="flex-row items-center mb-4 px-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                  <config.icon size={20} color="#000000" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                    {config.title}
                  </Text>
                  <Badge className="self-start mt-1" style={{ backgroundColor: '#333333' }}>
                    <Text className="text-xs" style={{ color: '#CCCCCC' }}>
                      {categoryItems.length} productos
                    </Text>
                  </Badge>
                </View>
              </View>

              {/* Category Items - Horizontal Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
                decelerationRate="fast"
                snapToInterval={cardWidth + 12} // Card width + gap
                snapToAlignment="start"
                pagingEnabled={false}
              >
                {categoryItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={{
                      width: cardWidth,
                      height: 160, // Fixed height for all cards
                      marginRight: index === categoryItems.length - 1 ? 0 : 12,
                    }}
                  >
                    <Card className="mb-4 h-full" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
                                              <Pressable onPress={() => handleItemPress(item)} className="h-full flex-1">
                          <View className="flex-1 justify-between">
                            <CardHeader className="pb-3">
                              <View className="flex-row justify-between items-start">
                                <View className="flex-1 mr-3">
                                  <CardTitle className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>
                                    {item.name}
                                  </CardTitle>
                                  <View className="flex-row items-center">
                                    <Text className="text-2xl font-bold" style={{ color: '#FAB10A' }}>
                                      €{item.price.toFixed(2)}
                                    </Text>
                                  </View>
                                  <CardDescription 
                                    className="text-sm mt-2" 
                                    style={{ color: '#CCCCCC' }}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                  >
                                    {item.description}
                                  </CardDescription>
                                </View>
                                {/* Item Image - Right Side */}
                                {item.imageUrl && (
                                  <View className="w-20 h-20 rounded-lg overflow-hidden" style={{ backgroundColor: '#222222' }}>
                                    <Image
                                      source={{ uri: `${API_URL.replace(/\/(v1|api)$/, "")}${item.imageUrl}` }}
                                      className="w-full h-full"
                                      resizeMode="cover"
                                    />
                                  </View>
                                )}
                              </View>
                            </CardHeader>
                            <CardFooter className="pt-0 flex-row justify-between items-center">
                          <View className="flex-1 mr-3">
                            <Badge className="self-start" style={{ backgroundColor: '#FAB10A' }}>
                              <Text className="text-xs font-medium" style={{ color: '#000000' }}>
                                {CATEGORY_CONFIG[item.category].title}
                              </Text>
                            </Badge>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleAddToCart(item)}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: '#FAB10A' }}
                          >
                            <Plus size={20} color="#000000" />
                          </TouchableOpacity>
                        </CardFooter>
                      </View>
                    </Pressable>
                    </Card>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}

        {/* Footer Spacing */}
        <View className="h-6" />
      </View>
    </ParallaxScrollView>
  );
} 