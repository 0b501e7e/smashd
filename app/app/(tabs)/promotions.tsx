import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity, StyleSheet, Dimensions, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { userAPI, orderAPI } from '@/services/api'; // Import userAPI and orderAPI

const { width } = Dimensions.get('window');

interface LastOrder {
  id: number;
  items: Array<{
    id: number;
    menuItemId: number;
    menuItem: {
      name: string;
      price: number;
    };
    quantity: number;
  }>;
  total: number;
  createdAt: string;
}

interface PromotionalMenuItem {
  id: number;
  name: string;
  imageUrl?: string;
  originalPrice: number;
  promotionalPrice: number;
  promotionTitle: string;
  description?: string;
}

interface MealDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
}

interface ActivePromotionsResponse {
  discountedItems: PromotionalMenuItem[];
  mealDeals: MealDeal[];
}

export default function PromotionsScreen() {
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [activePromotions, setActivePromotions] = useState<ActivePromotionsResponse>({ discountedItems: [], mealDeals: [] });
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivePromotions = async () => {
    setPromotionsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData: ActivePromotionsResponse = {
        discountedItems: [
          { id: 1, name: "Classic Smash Burger", originalPrice: 10.99, promotionalPrice: 8.99, promotionTitle: "20% Off!", imageUrl: "https://via.placeholder.com/150/FFC107/000000?Text=Burger", description: "Our best-selling classic burger." },
          { id: 2, name: "Spicy Chicken Sandwich", originalPrice: 11.50, promotionalPrice: 9.50, promotionTitle: "Save $2!", imageUrl: "https://via.placeholder.com/150/FF5722/FFFFFF?Text=Chicken+Sandwich", description: "Crispy chicken with a kick." },
        ],
        mealDeals: [
          { id: "deal1", title: "Family Feast", description: "2 Smash Burgers, 2 Kids Burgers, 4 Fries, 4 Drinks", price: 39.99, imageUrl: "https://via.placeholder.com/300/4CAF50/FFFFFF?Text=Family+Feast" },
          { id: "deal2", title: "Lunch Combo", description: "Any Burger + Side + Drink", price: 12.99, imageUrl: "https://via.placeholder.com/300/2196F3/FFFFFF?Text=Lunch+Combo" },
        ],
      };
      setActivePromotions(mockData);
    } catch (error) {
      console.error('Error fetching active promotions:', error);
      Alert.alert('Error', 'Could not load promotions. Please try again later.');
      setActivePromotions({ discountedItems: [], mealDeals: [] });
    } finally {
      setPromotionsLoading(false);
    }
  };

  const fetchLastOrder = async () => {
    if (!user) return;

    // console.log('[PromotionsScreen] Fetching last order for user:', user.id); // Keep or remove based on preference
    try {
      const data = await userAPI.getLastOrder(user.id);
      console.log('[PromotionsScreen] Successfully fetched last order:', data);
      setLastOrder(data);
    } catch (error: any) {
      console.log('[PromotionsScreen] Raw error object:', JSON.stringify(error));
      if (error.response && 
          error.response.status === 404 && 
          error.response.data?.error === 'No previous orders found') {
        // This is the expected case when a user has no previous paid orders. Be quiet.
        console.log('[PromotionsScreen] No previous paid orders found for user:', user.id);
        setLastOrder(null);
      } else {
        // This is an unexpected error.
        console.error('[PromotionsScreen] Exception while fetching last order:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch last order.';
        Alert.alert('Error Fetching Order', errorMessage);
        setLastOrder(null); // Ensure lastOrder is null on exception
      }
    }
  };

  const handleRepeatOrder = async () => {
    if (!lastOrder || !user) return;

    setLoading(true);
    try {
      // No need to manually get token, api instance handles it
      const data = await orderAPI.repeatOrder(lastOrder.id);
      
      clearCart();
      data.items.forEach((item: any) => {
        addItem({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations,
        });
      });
      
      if (data.unavailableItems && data.unavailableItems.length > 0) {
        Alert.alert(
          'Order Added with Changes!', 
          data.message || 'Some items were unavailable and have been removed.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Order Added!', 
          data.message || 'Your last order has been added to your cart.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error repeating order:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to repeat order. Please try again.';
      Alert.alert('Error Repeating Order', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLastOrder(), fetchActivePromotions()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLastOrder();
    fetchActivePromotions();
  }, [user]);

  const renderDiscountedItemCard = (item: PromotionalMenuItem) => (
    <TouchableOpacity
      key={`discount-${item.id}`}
      style={styles.carouselCardWrapper}
      activeOpacity={0.8}
      onPress={() => router.push(`/item-customization?itemId=${item.id}`)}
    >
      <Card className="bg-zinc-900 border-zinc-700 flex-1">
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.promoCardImage} />
        )}
        <CardHeader>
          <CardTitle className="text-white text-lg">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription className="text-yellow-400 font-semibold text-base mb-1">{item.promotionTitle}</CardDescription>
          <View style={styles.priceContainer}>
            <CardDescription className="text-gray-400 text-sm line-through">
              €{item.originalPrice.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-white font-bold text-base ml-2">
              €{item.promotionalPrice.toFixed(2)}
            </CardDescription>
          </View>
          {item.description && (
            <CardDescription className="text-gray-300 mt-2 text-xs">
              {item.description}
            </CardDescription>
          )}
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  const renderMealDealCard = (deal: MealDeal) => (
    <TouchableOpacity
      key={deal.id}
      style={styles.carouselCardWrapper}
      activeOpacity={0.8}
      onPress={() => Alert.alert("Oferta Seleccionada", `Has seleccionado ${deal.title}. Funcionalidad de agregar al carrito próximamente.`)}
    >
      <Card className="bg-zinc-900 border-zinc-700 flex-1">
        {deal.imageUrl && (
          <Image source={{ uri: deal.imageUrl }} style={styles.promoCardImage} />
        )}
        <CardHeader>
          <CardTitle className="text-white text-lg">{deal.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription className="text-gray-300 mb-2 text-sm">
            {deal.description}
          </CardDescription>
          <CardDescription className="text-yellow-500 font-bold text-xl text-right mt-auto">
            Solo €{deal.price.toFixed(2)}
          </CardDescription>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Logo and Branding */}
        <View style={styles.logoSection}>
          <AnimatedLogo />
          <ThemedText style={styles.brandTitle}>SMASHD</ThemedText>
          <ThemedText style={styles.welcomeText}>
            {user ? `¡Hola de nuevo, ${user.email}!` : '¡Bienvenidos a SMASHD!'}
          </ThemedText>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <View style={styles.benefitItem}>
            <IconSymbol name="gift" size={28} color={Colors.dark.text} />
            <ThemedText style={styles.benefitText}>Gana puntos con cada pedido</ThemedText>
          </View>
          
          <View style={styles.benefitItem}>
            <IconSymbol name="fork.knife" size={28} color={Colors.dark.text} />
            <ThemedText style={styles.benefitText}>Canjea puntos por comida gratis</ThemedText>
          </View>
          
          <View style={styles.benefitItem}>
            <IconSymbol name="star" size={28} color={Colors.dark.text} />
            <ThemedText style={styles.benefitText}>Recibe descuentos exclusivos</ThemedText>
          </View>
        </View>

        {/* Repeat Last Order Section */}
        {user && lastOrder && (
          <View style={styles.lastOrderContainer}>
            <ThemedText style={styles.lastOrderTitle}>Repetir Pedido</ThemedText>
            <TouchableOpacity 
              style={styles.repeatOrderButton} 
              onPress={handleRepeatOrder}
              disabled={loading}
            >
              <IconSymbol name="repeat" size={28} color="#000" />
              <ThemedText style={styles.repeatOrderButtonText}>
                Repetir Último Pedido ({new Date(lastOrder.createdAt).toLocaleDateString('es-ES')})
              </ThemedText>
              {loading && <ActivityIndicator color="#000" style={{ marginLeft: 15}} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        {!user && (
          <View style={styles.authButtons}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/(auth)/register')}
            >
              <ThemedText style={styles.primaryButtonText}>Registrarse</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <ThemedText style={styles.secondaryButtonText}>Iniciar Sesión</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Promotions Section */}
        <View style={styles.promotionsSection}>
          <ThemedText style={styles.sectionTitle}>Ofertas de Hoy</ThemedText>

          {promotionsLoading ? (
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} style={{ marginVertical: 20 }}/>
          ) : (
            <>
              {(activePromotions.discountedItems.length > 0 || activePromotions.mealDeals.length > 0) ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promotionsCarousel}
                  decelerationRate="fast"
                  snapToInterval={width * 0.75 + 15}
                  snapToAlignment="start"
                >
                  {activePromotions.discountedItems.map(renderDiscountedItemCard)}
                  {activePromotions.mealDeals.map(renderMealDealCard)}
                </ScrollView>
              ) : (
                <ThemedText style={styles.noPromotionsText}>
                  No hay ofertas especiales en este momento. ¡Vuelve pronto!
                </ThemedText>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.tint,
    marginTop: 10,
    letterSpacing: 2,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginTop: 8,
    textAlign: 'center',
  },
  benefitsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.dark.text,
  },
  lastOrderContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 15,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.tint
  },
  lastOrderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  repeatOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.tint,
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  repeatOrderButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  authButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.tint,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.tint,
  },
  promotionsSection: {
    marginTop: 20,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.dark.text,
    paddingHorizontal: 20,
  },
  promotionsCarousel: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  carouselCardWrapper: {
    width: width * 0.75,
    marginRight: 15,
    marginBottom: 10,
    minHeight: 280,
  },
  promoCardImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    marginBottom:0,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  noPromotionsText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
    color: Colors.dark.text,
  },
}); 