import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { driverAPI } from '@/services/api';
import { Truck, Package, MapPin, User, Clock } from 'lucide-react-native';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';

interface DriverOrder {
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

export default function DriverScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      console.log('[DriverScreen] Fetching orders...');
      const [fetchedOrders, fetchedActiveOrders] = await Promise.all([
        driverAPI.getOrders(),
        driverAPI.getActiveOrders()
      ]);
      console.log('[DriverScreen] Orders received:', fetchedOrders?.length || 0, fetchedOrders);
      console.log('[DriverScreen] Active orders received:', fetchedActiveOrders?.length || 0, fetchedActiveOrders);
      setOrders(fetchedOrders || []);
      setActiveOrders(fetchedActiveOrders || []);
      if (!fetchedOrders || fetchedOrders.length === 0) {
        console.log('[DriverScreen] No orders found - make sure orders are READY, DELIVERY, and have deliveryAddress');
      }
    } catch (error: any) {
      console.error('[DriverScreen] Error fetching driver orders:', error);
      console.error('[DriverScreen] Error details:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudieron cargar los pedidos',
        [{ text: 'OK' }]
      );
      setOrders([]);
      setActiveOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'DRIVER') {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleAcceptOrder = async (orderId: number) => {
    setAcceptingOrderId(orderId);
    try {
      await driverAPI.acceptOrder(orderId);
      // Navigate to detail screen so driver can access Google Maps immediately
      router.push({
        pathname: '/driver-order-detail',
        params: { orderId: orderId.toString() }
      });
      // Refresh orders list in background (will show empty since order is now OUT_FOR_DELIVERY)
      fetchOrders();
    } catch (error: any) {
      console.error('Error accepting order:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo aceptar el pedido',
        [{ text: 'OK' }]
      );
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const handleViewOrder = (orderId: number) => {
    router.push({
      pathname: '/driver-order-detail',
      params: { orderId: orderId.toString() }
    });
  };

  // Don't show driver screen if user is not a driver
  if (user?.role !== 'DRIVER') {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000' }}>
        <Text className="text-lg" style={{ color: '#FFFFFF' }}>
          Acceso denegado. Solo repartidores pueden ver esta pantalla.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color="#FAB10A" />
        <Text className="mt-4" style={{ color: '#CCCCCC' }}>
          Cargando pedidos...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FAB10A"
            colors={['#FAB10A']}
          />
        }
      >
        {/* Header */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardHeader>
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                <Truck size={24} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                  Pedidos para Entrega
                </Text>
                <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                  {orders.length} disponible{orders.length !== 1 ? 's' : ''}, {activeOrders.length} activo{activeOrders.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </CardHeader>
        </Card>

        {/* Active Orders Section */}
        {activeOrders.length > 0 && (
          <>
            <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#2196F3', borderWidth: 2 }}>
              <CardHeader>
                <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                  Mis Pedidos Activos
                </Text>
                <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                  Pedidos en camino
                </Text>
              </CardHeader>
            </Card>
            {activeOrders.map((order) => (
              <Card key={order.id} className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#2196F3', borderWidth: 1 }}>
                <CardContent className="p-6">
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Text className="text-lg font-bold mr-2" style={{ color: '#FFFFFF' }}>
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
                      {order.user && (
                        <View className="flex-row items-center mb-2">
                          <User size={14} color="#CCCCCC" />
                          <Text className="text-sm ml-2" style={{ color: '#CCCCCC' }}>
                            {order.user.name}
                          </Text>
                        </View>
                      )}
                      {order.deliveryAddress && (
                        <View className="flex-row items-start mb-2">
                          <MapPin size={14} color="#CCCCCC" style={{ marginTop: 2 }} />
                          <Text className="text-sm ml-2 flex-1" style={{ color: '#CCCCCC' }}>
                            {order.deliveryAddress.length > 50 
                              ? `${order.deliveryAddress.substring(0, 50)}...` 
                              : order.deliveryAddress}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-bold mb-2" style={{ color: '#FAB10A' }}>
                        €{order.total.toFixed(2)}
                      </Text>
                      <Badge style={{ backgroundColor: '#2196F3' }}>
                        <Text className="text-xs font-medium" style={{ color: '#FFFFFF' }}>
                          En Camino
                        </Text>
                      </Badge>
                    </View>
                  </View>

                  <Button
                    className="w-full"
                    style={{ backgroundColor: '#333333', borderColor: '#2196F3', borderWidth: 1 }}
                    onPress={() => handleViewOrder(order.id)}
                  >
                    <Text className="font-semibold" style={{ color: '#2196F3' }}>
                      Ver Detalles y Navegar
                    </Text>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Available Orders Section */}
        {activeOrders.length > 0 && (
          <Card className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardHeader>
              <Text className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                Pedidos Disponibles
              </Text>
              <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                Listos para aceptar
              </Text>
            </CardHeader>
          </Card>
        )}

        {/* Available Orders List */}
        {orders.length === 0 ? (
          <Card style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-8 items-center">
              <Package size={48} color="#666666" className="mb-4" />
              <Text className="text-lg font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                No hay pedidos disponibles
              </Text>
              <Text className="text-sm text-center" style={{ color: '#CCCCCC' }}>
                Cuando haya pedidos listos para entrega, aparecerán aquí.
              </Text>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="mb-4" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
              <CardContent className="p-6">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-lg font-bold mr-2" style={{ color: '#FFFFFF' }}>
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
                    {order.user && (
                      <View className="flex-row items-center mb-2">
                        <User size={14} color="#CCCCCC" />
                        <Text className="text-sm ml-2" style={{ color: '#CCCCCC' }}>
                          {order.user.name}
                        </Text>
                      </View>
                    )}
                    {order.deliveryAddress && (
                      <View className="flex-row items-start mb-2">
                        <MapPin size={14} color="#CCCCCC" style={{ marginTop: 2 }} />
                        <Text className="text-sm ml-2 flex-1" style={{ color: '#CCCCCC' }}>
                          {order.deliveryAddress.length > 50 
                            ? `${order.deliveryAddress.substring(0, 50)}...` 
                            : order.deliveryAddress}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center">
                      <Clock size={14} color="#CCCCCC" />
                      <Text className="text-xs ml-2" style={{ color: '#666666' }}>
                        {new Date(order.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold mb-2" style={{ color: '#FAB10A' }}>
                      €{order.total.toFixed(2)}
                    </Text>
                    <Badge style={{ backgroundColor: '#4CAF50' }}>
                      <Text className="text-xs font-medium" style={{ color: '#FFFFFF' }}>
                        Listo
                      </Text>
                    </Badge>
                  </View>
                </View>

                <View className="flex-row gap-3 mt-4">
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#333333', borderColor: '#FAB10A', borderWidth: 1 }}
                    onPress={() => handleViewOrder(order.id)}
                  >
                    <Text className="font-semibold" style={{ color: '#FAB10A' }}>
                      Ver Detalles
                    </Text>
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#FAB10A' }}
                    onPress={() => handleAcceptOrder(order.id)}
                    disabled={acceptingOrderId === order.id}
                  >
                    {acceptingOrderId === order.id ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text className="font-semibold" style={{ color: '#000000' }}>
                        Aceptar
                      </Text>
                    )}
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

