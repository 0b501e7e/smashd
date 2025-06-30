import { FlatList, ActivityIndicator, View, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { orderAPI } from '@/services/api';
import { User, ShoppingBag, Award, LogOut, Calendar, Package } from 'lucide-react-native';

// RNR Components
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  menuItem?: {
    name: string;
  };
  customizations?: string;
}

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_COLORS = {
  'PENDING': 'bg-yellow-500',
  'CONFIRMED': 'bg-blue-500',
  'PREPARING': 'bg-purple-500',
  'READY': 'bg-green-500',
  'COMPLETED': 'bg-green-600',
  'CANCELLED': 'bg-red-500',
};

const STATUS_LABELS = {
  'PENDING': 'Pendiente',
  'CONFIRMED': 'Confirmado',
  'PREPARING': 'Preparando',
  'READY': 'Listo',
  'COMPLETED': 'Completado',
  'CANCELLED': 'Cancelado',
};

export default function ProfileScreen() {
  const { user, isLoggedIn, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn || !user?.id) {
      setOrders([]);
      return;
    }
    setIsLoadingOrders(true);
    setOrderError(null);
    try {
      const fetchedOrders = await orderAPI.getUserOrders(Number(user.id));
      setOrders(fetchedOrders || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setOrderError(error.message || 'Failed to fetch order history.');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleLogout = async () => {
    await logout();
    setOrders([]);
  };

  if (!isLoggedIn) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: '#000000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Card className="w-full max-w-sm" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-6 items-center">
            <User size={64} color="#FAB10A" className="mb-4" />
            <Text className="text-center mb-6 text-lg" style={{ color: '#FFFFFF' }}>
              Por favor, inicia sesión para ver tu perfil e historial de pedidos
            </Text>
            <Button 
              onPress={handleLogin}
              className="w-full"
              style={{ backgroundColor: '#FAB10A' }}
            >
              <Text className="font-semibold" style={{ color: '#000000' }}>
                Iniciar Sesión
              </Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View className="py-2 border-b" style={{ borderColor: '#333333' }}>
      <Text className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
        {item.quantity} x {item.menuItem?.name || `Producto ID: ${item.menuItemId}`}
      </Text>
      <Text className="text-xs mt-1" style={{ color: '#CCCCCC' }}>
        Precio: €{(item.price * item.quantity).toFixed(2)}
      </Text>
      {item.customizations && (
        <Text className="text-xs mt-1 italic" style={{ color: '#AAAAAA' }}>
          Personalizaciones: {typeof item.customizations === 'string' ? item.customizations : JSON.stringify(item.customizations)}
        </Text>
      )}
    </View>
  );

  const renderOrderCard = ({ item }: { item: Order }) => (
    <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
      <CardHeader className="pb-3">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Package size={18} color="#FAB10A" className="mr-2" />
            <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Pedido #{item.id}
            </Text>
          </View>
          <Badge 
            className={`${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || 'bg-gray-500'}`}
          >
            <Text className="text-xs font-medium text-white">
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
            </Text>
          </Badge>
        </View>
        <View className="flex-row items-center mt-1">
          <Calendar size={14} color="#CCCCCC" className="mr-1" />
          <Text className="text-sm" style={{ color: '#CCCCCC' }}>
            {new Date(item.createdAt).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </CardHeader>
      
      <CardContent className="pt-0">
        <View className="mb-4">
          {item.items.map((orderItem, index) => (
            <View key={orderItem.id}>
              {renderOrderItem({ item: orderItem })}
            </View>
          ))}
        </View>
        
        <Separator style={{ backgroundColor: '#333333' }} />
        
        <View className="flex-row justify-between items-center mt-4">
          <Text className="text-sm font-medium" style={{ color: '#CCCCCC' }}>
            Total del pedido:
          </Text>
          <Text className="text-lg font-bold" style={{ color: '#FAB10A' }}>
            €{item.total.toFixed(2)}
          </Text>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 16
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-6 items-center">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FAB10A' }}>
              <User size={40} color="#000000" />
            </View>
            <Text className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              Mi Perfil
            </Text>
            {user && (
              <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                {user.email}
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <User size={20} color="#FAB10A" className="mr-2" />
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Detalles de la Cuenta
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            {user && (
              <View>
                <Text className="text-sm mb-2" style={{ color: '#CCCCCC' }}>
                  Email: {user.email}
                </Text>
                {/* Add other user details here once available from backend */}
              </View>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Points */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <Award size={20} color="#FAB10A" className="mr-2" />
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Puntos de Fidelidad
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold mr-2" style={{ color: '#FAB10A' }}>
                {user?.loyaltyPoints || 0}
              </Text>
              <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                puntos disponibles
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <ShoppingBag size={20} color="#FAB10A" className="mr-2" />
              <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                Historial de Pedidos
              </Text>
            </View>
          </CardHeader>
        </Card>

        {/* Orders List */}
        {isLoadingOrders ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#FAB10A" />
            <Text className="mt-4 text-sm" style={{ color: '#CCCCCC' }}>
              Cargando pedidos...
            </Text>
          </View>
        ) : orderError ? (
          <Card style={{ backgroundColor: '#111111', borderColor: '#ff4444' }}>
            <CardContent className="p-6 items-center">
              <Text className="text-center text-sm" style={{ color: '#ff4444' }}>
                {orderError}
              </Text>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-6 items-center">
              <ShoppingBag size={48} color="#666666" className="mb-4" />
              <Text className="text-center" style={{ color: '#CCCCCC' }}>
                Aún no has hecho ningún pedido.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="mb-6">
            {orders
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((order) => (
                <View key={order.id}>
                  {renderOrderCard({ item: order })}
                </View>
              ))}
          </View>
        )}

        {/* Logout Button */}
        <Button 
          onPress={handleLogout}
          className="w-full"
          style={{ backgroundColor: '#ff4444' }}
        >
          <View className="flex-row items-center">
            <LogOut size={18} color="#FFFFFF" className="mr-2" />
            <Text className="font-semibold" style={{ color: '#FFFFFF' }}>
              Cerrar Sesión
            </Text>
          </View>
        </Button>
      </ScrollView>
    </View>
  );
}
