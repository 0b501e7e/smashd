import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle, Info, Gift, Utensils, Star, RotateCcw } from 'lucide-react-native';

// RNR Components
import { Text } from '@/components/ui/text';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { userAPI, orderAPI } from '@/services/api';

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
  const insets = useSafeAreaInsets();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [activePromotions, setActivePromotions] = useState<ActivePromotionsResponse>({ discountedItems: [], mealDeals: [] });
  const [refreshing, setRefreshing] = useState(false);
  
  // AlertDialog states
  const [errorDialog, setErrorDialog] = useState<{open: boolean, title: string, message: string}>({
    open: false, title: '', message: ''
  });
  const [successDialog, setSuccessDialog] = useState<{open: boolean, title: string, message: string}>({
    open: false, title: '', message: ''
  });
  const [mealDealDialog, setMealDealDialog] = useState<{open: boolean, dealTitle: string}>({
    open: false, dealTitle: ''
  });

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
      setErrorDialog({
        open: true,
        title: 'Error',
        message: 'No se pudieron cargar las promociones. Inténtalo de nuevo más tarde.'
      });
      setActivePromotions({ discountedItems: [], mealDeals: [] });
    } finally {
      setPromotionsLoading(false);
    }
  };

  const fetchLastOrder = async () => {
    // Only fetch last order if user is logged in (not in guest mode)
    if (!user) {
      setLastOrder(null);
      return;
    }

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
        setErrorDialog({
          open: true,
          title: 'Error al Obtener Pedido',
          message: errorMessage
        });
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
        setSuccessDialog({
          open: true,
          title: 'Pedido Agregado con Cambios', 
          message: data.message || 'Algunos productos no estaban disponibles y han sido eliminados.'
        });
      } else {
        setSuccessDialog({
          open: true,
          title: 'Pedido Agregado', 
          message: data.message || 'Tu último pedido ha sido agregado a tu carrito.'
        });
      }
    } catch (error: any) {
      console.error('Error repeating order:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to repeat order. Please try again.';
      setErrorDialog({
        open: true,
        title: 'Error al Repetir Pedido',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Only fetch last order if user is logged in, always fetch promotions
    const promises = [fetchActivePromotions()];
    if (user) {
      promises.push(fetchLastOrder());
    }
    await Promise.all(promises);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLastOrder();
    fetchActivePromotions();
  }, [user]);

  const renderDiscountedItemCard = (item: PromotionalMenuItem) => (
    <TouchableOpacity
      key={`discount-${item.id}`}
      style={{ width: width * 0.75, marginRight: 15, marginBottom: 10, minHeight: 280 }}
      activeOpacity={0.8}
      onPress={() => router.push(`/item-customization?itemId=${item.id}`)}
    >
      <Card className="bg-zinc-900 border-zinc-700 flex-1">
        {item.imageUrl && (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={{ width: '100%', height: 120, borderTopLeftRadius: 7, borderTopRightRadius: 7, marginBottom: 0 }}
          />
        )}
        <CardHeader>
          <CardTitle className="text-white text-lg">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription className="text-yellow-400 font-semibold text-base mb-1">{item.promotionTitle}</CardDescription>
          <View className="flex-row items-center mb-1">
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
      style={{ width: width * 0.75, marginRight: 15, marginBottom: 10, minHeight: 280 }}
      activeOpacity={0.8}
      onPress={() => setMealDealDialog({ open: true, dealTitle: deal.title })}
    >
      <Card className="bg-zinc-900 border-zinc-700 flex-1">
        {deal.imageUrl && (
          <Image 
            source={{ uri: deal.imageUrl }} 
            style={{ width: '100%', height: 120, borderTopLeftRadius: 7, borderTopRightRadius: 7, marginBottom: 0 }}
          />
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
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="pb-24"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Logo and Branding */}
        <View className="items-center pt-5 pb-8">
          <AnimatedLogo />
          <Text className="text-3xl font-bold text-yellow-500 mt-3 tracking-wider">SMASHD</Text>
          <Text className="text-base text-gray-200 mt-2 text-center">
            {user ? `¡Hola de nuevo, ${user.email}!` : '¡Bienvenidos a SMASHD!'}
          </Text>
        </View>

        {/* Benefits Section */}
        <View className="px-5 py-5">
          <View className="flex-row items-center bg-zinc-800 p-4 rounded-xl mb-3">
            <Gift size={28} color="#e5e7eb" />
            <Text className="ml-3 text-base text-gray-200">Gana puntos con cada pedido</Text>
          </View>
          
          <View className="flex-row items-center bg-zinc-800 p-4 rounded-xl mb-3">
            <Utensils size={28} color="#e5e7eb" />
            <Text className="ml-3 text-base text-gray-200">Canjea puntos por comida gratis</Text>
          </View>
          
          <View className="flex-row items-center bg-zinc-800 p-4 rounded-xl mb-3">
            <Star size={28} color="#e5e7eb" />
            <Text className="ml-3 text-base text-gray-200">Recibe descuentos exclusivos</Text>
          </View>
        </View>

        {/* Repeat Last Order Section */}
        {user && lastOrder && (
          <View className="mx-5 mt-5 mb-3 p-4 bg-black rounded-xl border border-yellow-500">
            <Text className="text-xl font-bold mb-3 text-gray-200 text-center">Repetir Pedido</Text>
            <TouchableOpacity 
              className="flex-row items-center justify-center bg-yellow-500 py-5 px-6 rounded-xl"
              onPress={handleRepeatOrder}
              disabled={loading}
            >
              <RotateCcw size={28} color="#000" />
              <Text className="text-black text-lg font-bold ml-3 flex-1">
                Repetir Último Pedido ({new Date(lastOrder.createdAt).toLocaleDateString('es-ES')})
              </Text>
              {loading && <ActivityIndicator color="#000" style={{ marginLeft: 15}} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        {!user && (
          <View className="px-5 py-5 gap-3">
            <Button 
              className="bg-green-500 rounded-xl p-5"
              onPress={() => router.push('/(auth)/register')}
            >
              <Text className="text-lg font-bold text-white">Registrarse</Text>
            </Button>
            
            <Button 
              variant="outline"
              className="bg-zinc-800 rounded-xl p-5 border-2 border-yellow-500"
              onPress={() => router.push('/(auth)/login')}
            >
              <Text className="text-lg font-bold text-yellow-500">Iniciar Sesión</Text>
            </Button>
          </View>
        )}

        {/* Promotions Section */}
        <View className="mt-5 px-0">
          <Text className="text-xl font-bold mb-4 text-gray-200 px-5">Ofertas de Hoy</Text>

          {promotionsLoading ? (
            <ActivityIndicator size="large" color="#eab308" style={{ marginVertical: 20 }}/>
          ) : (
            <>
              {(activePromotions.discountedItems.length > 0 || activePromotions.mealDeals.length > 0) ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 20, paddingRight: 5 }}
                  decelerationRate="fast"
                  snapToInterval={width * 0.75 + 15}
                  snapToAlignment="start"
                >
                  {activePromotions.discountedItems.map(renderDiscountedItemCard)}
                  {activePromotions.mealDeals.map(renderMealDealCard)}
                </ScrollView>
              ) : (
                <Text className="text-center text-base mt-5 mb-5 text-gray-200">
                  No hay ofertas especiales en este momento. ¡Vuelve pronto!
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Error AlertDialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({...prev, open}))}>
        <AlertDialogContent style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <AlertDialogHeader>
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255, 68, 68, 0.2)' }}>
                <AlertTriangle size={24} color="#FF4444" />
              </View>
              <AlertDialogTitle style={{ color: '#FFFFFF', flex: 1 }}>
                {errorDialog.title}
              </AlertDialogTitle>
            </View>
            <AlertDialogDescription style={{ color: '#CCCCCC' }}>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction style={{ backgroundColor: '#FAB10A' }}>
              <Text style={{ color: '#000000', fontWeight: 'bold' }}>Aceptar</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success AlertDialog */}
      <AlertDialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog(prev => ({...prev, open}))}>
        <AlertDialogContent style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <AlertDialogHeader>
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)' }}>
                <CheckCircle size={24} color="#4CAF50" />
              </View>
              <AlertDialogTitle style={{ color: '#FFFFFF', flex: 1 }}>
                {successDialog.title}
              </AlertDialogTitle>
            </View>
            <AlertDialogDescription style={{ color: '#CCCCCC' }}>
              {successDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction style={{ backgroundColor: '#FAB10A' }}>
              <Text style={{ color: '#000000', fontWeight: 'bold' }}>Aceptar</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Meal Deal AlertDialog */}
      <AlertDialog open={mealDealDialog.open} onOpenChange={(open) => setMealDealDialog(prev => ({...prev, open}))}>
        <AlertDialogContent style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <AlertDialogHeader>
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(251, 177, 10, 0.2)' }}>
                <Info size={24} color="#FAB10A" />
              </View>
              <AlertDialogTitle style={{ color: '#FFFFFF', flex: 1 }}>
                Oferta Seleccionada
              </AlertDialogTitle>
            </View>
            <AlertDialogDescription style={{ color: '#CCCCCC' }}>
              Has seleccionado "{mealDealDialog.dealTitle}". Esta funcionalidad estará disponible próximamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction style={{ backgroundColor: '#FAB10A' }}>
              <Text style={{ color: '#000000', fontWeight: 'bold' }}>Aceptar</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
} 