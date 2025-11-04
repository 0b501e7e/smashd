import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { driverAPI } from '@/services/api';
import { Truck, MapPin, User, Package, CheckCircle, Phone, Clock } from 'lucide-react-native';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DriverOrderDetail {
  id: number;
  orderCode: string | null;
  deliveryAddress: string | null;
  status: string;
  total: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
    phoneNumber: string;
  } | null;
  items: Array<{
    id: number;
    quantity: number;
    price: number;
    menuItem: {
      id: number;
      name: string;
    };
  }>;
}

export default function DriverOrderDetailScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [order, setOrder] = useState<DriverOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      Alert.alert('Error', 'ID de pedido no proporcionado', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const numOrderId = Number(orderId);
      if (isNaN(numOrderId)) {
        throw new Error('ID de pedido inválido');
      }
      const orderData = await driverAPI.getOrderDetails(numOrderId);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudieron cargar los detalles del pedido',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!order) return;
    
    setProcessing(true);
    try {
      await driverAPI.acceptOrder(order.id);
      // Refresh order details to get updated status (OUT_FOR_DELIVERY)
      // This keeps the Google Maps link visible
      await fetchOrderDetails();
      // Show brief success feedback without blocking the UI
      Alert.alert(
        'Pedido aceptado',
        'Has aceptado el pedido. El cliente ha sido notificado. Puedes usar el enlace de Google Maps para navegar.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error accepting order:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo aceptar el pedido',
        [{ text: 'OK' }]
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!order) return;
    
    Alert.alert(
      'Confirmar entrega',
      '¿Confirmas que el pedido ha sido entregado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              await driverAPI.markDelivered(order.id);
              Alert.alert(
                'Pedido entregado',
                'El pedido ha sido marcado como entregado. El cliente ha sido notificado.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    // Navigate back to driver list to see new orders
                    router.replace('/(tabs)/driver');
                  }
                }]
              );
            } catch (error: any) {
              console.error('Error marking order as delivered:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'No se pudo marcar el pedido como entregado',
                [{ text: 'OK' }]
              );
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!order?.deliveryAddress) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'No se pudo abrir Google Maps');
    });
  };

  const handleCallCustomer = () => {
    if (!order?.user?.phoneNumber) return;
    
    const phoneUrl = `tel:${order.user.phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err => {
      console.error('Error calling customer:', err);
      Alert.alert('Error', 'No se pudo realizar la llamada');
    });
  };

  if (user?.role !== 'DRIVER') {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000' }}>
        <Text className="text-lg" style={{ color: '#FFFFFF' }}>
          Acceso denegado
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color="#FAB10A" />
        <Text className="mt-4" style={{ color: '#CCCCCC' }}>
          Cargando detalles del pedido...
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000' }}>
        <Text className="text-lg" style={{ color: '#FFFFFF' }}>
          Pedido no encontrado
        </Text>
        <Button
          className="mt-4"
          style={{ backgroundColor: '#FAB10A' }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#000000' }}>Volver</Text>
        </Button>
      </View>
    );
  }

  const canAccept = order.status === 'READY';
  const canDeliver = order.status === 'OUT_FOR_DELIVERY';
  
  // Google Maps should always be visible for delivery orders with address
  const showGoogleMaps = order.deliveryAddress && (order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY');

  return (
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                <Truck size={24} color="#000000" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-xl font-bold mr-2" style={{ color: '#FFFFFF' }}>
                    Pedido #{order.id}
                  </Text>
                  {order.orderCode && (
                    <Badge style={{ backgroundColor: '#333333' }}>
                      <Text className="text-xs font-medium" style={{ color: '#FAB10A' }}>
                        {order.orderCode}
                      </Text>
                    </Badge>
                  )}
                </View>
                <Badge style={{ 
                  backgroundColor: canDeliver ? '#2196F3' : '#4CAF50' 
                }}>
                  <Text className="text-xs font-medium" style={{ color: '#FFFFFF' }}>
                    {canDeliver ? 'En camino' : 'Listo'}
                  </Text>
                </Badge>
              </View>
            </View>
          </CardHeader>
        </Card>

        {/* Customer Info */}
        {order.user && (
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardHeader>
              <View className="flex-row items-center">
                <User size={20} color="#FAB10A" />
                <Text className="text-lg font-bold ml-2" style={{ color: '#FFFFFF' }}>
                  Cliente
                </Text>
              </View>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Text className="text-base mb-2" style={{ color: '#FFFFFF' }}>
                {order.user.name}
              </Text>
              {order.user.phoneNumber && (
                <Button
                  className="mt-3"
                  style={{ backgroundColor: '#333333', borderColor: '#FAB10A', borderWidth: 1 }}
                  onPress={handleCallCustomer}
                >
                  <View className="flex-row items-center gap-2">
                    <Phone size={16} color="#FAB10A" />
                    <Text className="font-semibold" style={{ color: '#FAB10A' }}>
                      Llamar: {order.user.phoneNumber}
                    </Text>
                  </View>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery Address - Always show when address exists, regardless of status */}
        {showGoogleMaps && (
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#FAB10A', borderWidth: canDeliver ? 2 : 1 }}>
            <CardHeader>
              <View className="flex-row items-center">
                <MapPin size={20} color="#FAB10A" />
                <Text className="text-lg font-bold ml-2" style={{ color: '#FFFFFF' }}>
                  Dirección de entrega
                </Text>
              </View>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Text className="text-base mb-4" style={{ color: '#FFFFFF' }}>
                {order.deliveryAddress}
              </Text>
              <Button
                style={{ backgroundColor: canDeliver ? '#2196F3' : '#333333', borderColor: '#FAB10A', borderWidth: 1 }}
                onPress={handleOpenMaps}
              >
                <View className="flex-row items-center gap-2">
                  <MapPin size={16} color="#FAB10A" />
                  <Text className="font-semibold" style={{ color: '#FAB10A' }}>
                    Abrir en Google Maps
                  </Text>
                </View>
              </Button>
              {canDeliver && (
                <Text className="text-xs mt-2 text-center" style={{ color: '#CCCCCC' }}>
                  Navega a la dirección para entregar el pedido
                </Text>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <Package size={20} color="#FAB10A" />
              <Text className="text-lg font-bold ml-2" style={{ color: '#FFFFFF' }}>
                Productos
              </Text>
            </View>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <View className="gap-4">
              {order.items.map((item, index) => (
                <View key={item.id}>
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      <Text className="font-semibold text-base mb-1" style={{ color: '#FFFFFF' }}>
                        {item.quantity}x {item.menuItem.name}
                      </Text>
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

        {/* Order Info */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-6">
            <View className="flex-row items-center">
              <Clock size={16} color="#CCCCCC" />
              <Text className="text-sm ml-2" style={{ color: '#CCCCCC' }}>
                Creado: {new Date(order.createdAt).toLocaleString('es-ES')}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View className="gap-4 mb-6">
          {/* Only show accept button if order is READY (not already accepted) */}
          {canAccept && order.status === 'READY' && (
            <Button
              className="h-14"
              style={{ backgroundColor: '#FAB10A' }}
              onPress={handleAcceptOrder}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <CheckCircle size={20} color="#000000" />
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>
                    Aceptar Pedido
                  </Text>
                </View>
              )}
            </Button>
          )}

          {/* Show deliver button if order is OUT_FOR_DELIVERY */}
          {canDeliver && order.status === 'OUT_FOR_DELIVERY' && (
            <Button
              className="h-14"
              style={{ backgroundColor: '#4CAF50' }}
              onPress={handleMarkDelivered}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>
                    Marcar como Entregado
                  </Text>
                </View>
              )}
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

