import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { 
  CheckCircle, 
  Clock, 
  Flame, 
  Bell, 
  XCircle, 
  AlertTriangle,
  Package,
  User,
  CreditCard,
  Plus,
  ArrowRight,
  RefreshCw,
  Truck
} from 'lucide-react-native';

// RNR Components
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

type OrderDetails = {
  id: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
  total: number;
  status: OrderStatus;
  estimatedReadyTime: string | null;
  createdAt: string;
  transactionId?: string;
  fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string | null;
};

export default function OrderConfirmationScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId || params.order_id;
  const transactionId = params.transaction_id;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const numOrderId = Number(orderId);
        if (isNaN(numOrderId)) {
          setError('Invalid order ID');
          setLoading(false);
          return;
        }
        
        const orderDetails = await orderAPI.getOrderStatus(numOrderId);
        setOrder(orderDetails);
        
        // Provide success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        console.error('Error fetching order details:', error);
        setError(error.message || 'Failed to load order details');
        
        // Provide error feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);

  // Add polling for order status updates
  useEffect(() => {
    if (!orderId || !order || (order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'DELIVERED')) {
      return; // Don't poll if no order, or order is in a terminal state
    }

    const numOrderId = Number(orderId);
    if (isNaN(numOrderId)) return;

    const intervalId = setInterval(async () => {
      try {
        console.log(`Polling for status update on order ${numOrderId}`);
        const updatedOrderDetails = await orderAPI.getOrderStatus(numOrderId);
        setOrder(updatedOrderDetails);
      } catch (error) {
        console.error('Error polling order status:', error);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or when dependencies change
  }, [orderId, order]); // Re-run if orderId changes or order data (like status) changes
  
  // Format estimated ready time
  const getEstimatedReadyTime = () => {
    if (!order || !order.createdAt) return 'Desconocido';
    
    try {
      // Use estimatedReadyTime if available
      if (order.estimatedReadyTime) {
        return new Date(order.estimatedReadyTime).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      // Fall back to a default of 15-20 minutes if no estimatedReadyTime
      const createdDate = new Date(order.createdAt);
      const readyDate = new Date(createdDate.getTime() + 20 * 60000);
      return readyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error calculating ready time:', error);
      return 'Desconocido';
    }
  };
  
  // Get status color and icon based on order status
  const getStatusInfo = () => {
    if (!order) return { color: '#CCCCCC', icon: Clock, text: 'Desconocido' };
    
    switch (order.status) {
      case 'PAID':
        return { color: '#4CAF50', icon: CheckCircle, text: 'Pago Confirmado' };
      case 'CONFIRMED':
        return { color: '#FAB10A', icon: Flame, text: 'Pedido Confirmado, ¡Preparándose!' };
      case 'PREPARING':
        return { color: '#FAB10A', icon: Flame, text: 'Preparando tu Pedido' };
      case 'READY':
        return { color: '#2196F3', icon: Bell, text: order.fulfillmentMethod === 'DELIVERY' ? 'Listo para Entrega' : 'Listo para Recoger' };
      case 'OUT_FOR_DELIVERY':
        return { color: '#2196F3', icon: Truck, text: '¡En Camino! Tu pedido está siendo entregado' };
      case 'DELIVERED':
        return { color: '#4CAF50', icon: CheckCircle, text: '¡Entregado! Disfruta tu pedido' };
      case 'COMPLETED':
        return { color: '#4CAF50', icon: CheckCircle, text: 'Pedido Completado' };
      case 'CANCELLED':
        return { color: '#F44336', icon: XCircle, text: 'Pedido Cancelado' };
      default:
        return { color: '#FAB10A', icon: Clock, text: 'Procesando' };
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#FAB10A' }}>
            <RefreshCw size={32} color="#000000" />
          </View>
          <ActivityIndicator size="large" color="#FAB10A" className="mb-4" />
          <Text className="text-lg font-medium text-center" style={{ color: '#FFFFFF' }}>
            Cargando detalles del pedido...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state
  if (error || !order) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6" style={{ backgroundColor: 'rgba(255, 68, 68, 0.2)' }}>
            <AlertTriangle size={32} color="#FF4444" />
          </View>
          <Text className="text-lg font-medium text-center mb-4" style={{ color: '#FF4444' }}>
            {error || 'No se pudieron cargar los detalles del pedido'}
          </Text>
          <Button
            className="h-12 px-6"
            style={{ backgroundColor: '#FAB10A' }}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text className="text-base font-semibold" style={{ color: '#000000' }}>
              Volver a la Carta
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  // Success state - order details
  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 48) }}
      >
        <View className="p-6">
          {/* Success Header */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-8">
              <View className="items-center">
                <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#4CAF50' }}>
                  <CheckCircle size={40} color="#FFFFFF" />
                </View>
                <Text className="text-2xl font-bold text-center mb-2" style={{ color: '#FFFFFF' }}>
                  ¡Gracias por tu Pedido!
                </Text>
                <Text className="text-base text-center leading-6" style={{ color: '#CCCCCC' }}>
                  Tu pedido ha sido confirmado y pagado.
                </Text>
              </View>
            </CardContent>
          </Card>
          
          {/* Order Information */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardHeader>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                  <Package size={24} color="#000000" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                    Información del Pedido
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <View className="gap-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-medium" style={{ color: '#CCCCCC' }}>
                    Número de Pedido:
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                    #{order.id}
                  </Text>
                </View>
                
                {transactionId && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-medium" style={{ color: '#CCCCCC' }}>
                      ID de Transacción:
                    </Text>
                    <Text className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                      {transactionId}
                    </Text>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-medium" style={{ color: '#CCCCCC' }}>
                    Estado:
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <StatusIcon size={16} color={statusInfo.color} />
                    <Text className="text-sm font-bold" style={{ color: statusInfo.color }}>
                      {statusInfo.text}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-medium" style={{ color: '#CCCCCC' }}>
                    Tiempo Estimado:
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                    {getEstimatedReadyTime()}
                  </Text>
                </View>

                {order.fulfillmentMethod === 'DELIVERY' && order.deliveryAddress && (
                  <View className="mt-2">
                    <Text className="text-sm font-medium mb-1" style={{ color: '#CCCCCC' }}>
                      Dirección de entrega:
                    </Text>
                    <Text className="text-sm" style={{ color: '#FFFFFF' }}>{order.deliveryAddress}</Text>
                    <View className="mt-3">
                      <Button
                        className="h-10"
                        style={{ backgroundColor: '#333333', borderColor: '#FAB10A', borderWidth: 1 }}
                        onPress={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress || '')}`;
                          router.push({ pathname: '/payment-webview', params: { url } as any });
                        }}
                      >
                        <View className="flex-row items-center gap-2">
                          <Text className="text-base font-semibold" style={{ color: '#FAB10A' }}>
                            Abrir en Google Maps
                          </Text>
                        </View>
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardHeader>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                  <Package size={24} color="#000000" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                    Productos Pedidos
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <View className="gap-4">
                {order.items.map((item, index) => (
                  <View key={index}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-3">
                        <Text className="font-semibold text-base mb-1" style={{ color: '#FFFFFF' }}>
                          {item.quantity}x {item.name}
                        </Text>
                        
                        {item.customizations && Object.keys(item.customizations).length > 0 && (
                          <View className="mt-2">
                            {Object.entries(item.customizations).map(([key, value]) => (
                              <View key={key} className="flex-row items-center mb-1">
                                <Plus size={12} color="#FAB10A" />
                                <Text className="text-xs ml-1" style={{ color: '#CCCCCC' }}>
                                  {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      
                      <Text className="font-bold text-lg" style={{ color: '#FAB10A' }}>
                        €{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                    
                    {index < order.items.length - 1 && (
                      <Separator style={{ backgroundColor: '#333333', marginTop: 16 }} />
                    )}
                  </View>
                ))}
                
                <Separator style={{ backgroundColor: '#333333', marginVertical: 16 }} />
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                    Total:
                  </Text>
                  <Text className="text-xl font-bold" style={{ color: '#FAB10A' }}>
                    €{order.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <View className="gap-4">
            <Button 
              className="h-14"
              style={{ backgroundColor: '#FAB10A' }}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View className="flex-row items-center gap-2">
                <User size={20} color="#000000" />
                <Text className="text-base font-semibold" style={{ color: '#000000' }}>
                  Ver Historial de Pedidos
                </Text>
              </View>
            </Button>
            
            <Button 
              className="h-14"
              style={{ backgroundColor: '#333333', borderColor: '#FAB10A', borderWidth: 1 }}
              onPress={() => router.push('/(tabs)/menu')}
            >
              <View className="flex-row items-center gap-2">
                <ArrowRight size={20} color="#FAB10A" />
                <Text className="text-base font-semibold" style={{ color: '#FAB10A' }}>
                  Hacer Otro Pedido
                </Text>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
