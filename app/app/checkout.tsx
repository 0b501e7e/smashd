import React, { useEffect, useRef } from 'react';
import { Alert, View, AppState, AppStateStatus, ScrollView, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import { sumupService } from '@/services/sumupService';
import api from '@/services/api';
import { ShoppingCart, CreditCard, CheckCircle, AlertCircle, Package, Plus, Minus } from 'lucide-react-native';

// RNR Components
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function CheckoutScreen() {
  const { orderId: urlOrderId, returnToApp } = useLocalSearchParams();
  const { items, total, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const paymentAttemptedRef = useRef(false);
  const appStateListenerRef = useRef<any>(null);
  
  // Helper function to check order payment status
  const checkOrderStatus = async (orderIdToCheck: number): Promise<boolean> => {
    try {
      console.log('Checking status for order:', orderIdToCheck);
      const orderStatus = await sumupService.getPaymentStatus(orderIdToCheck);
      return orderStatus?.status === 'PAID';
    } catch (error) {
      console.error('Error checking order status:', error);
      return false;
    }
  };
  
  // Helper function to handle the outcome of payment status check
  const processPaymentOutcome = (isPaid: boolean, currentOrderId: number) => {
    if (isPaid) {
      Alert.alert(
        'Pago Exitoso',
        'Tu pago fue procesado exitosamente. ¿Te gustaría ver el estado de tu pedido?',
        [
          {
            text: 'Ahora No',
            style: 'cancel',
            onPress: () => {
              setIsProcessing(false);
              paymentAttemptedRef.current = false;
              router.push('/(tabs)/menu');
            }
          },
          {
            text: 'Ver Pedido',
            onPress: () => {
              setIsProcessing(false);
              paymentAttemptedRef.current = false;
              router.push({
                pathname: '/order-confirmation',
                params: { orderId: currentOrderId.toString() }
              });
            }
          }
        ],
        { cancelable: false }
      );
      clearCart();
    } else {
      Alert.alert(
        'Pago Aún No Confirmado',
        'No pudimos confirmar tu pago todavía. Esto puede tardar unos momentos en actualizarse. Intenta verificar de nuevo en unos segundos, o revisa tu historial de pedidos más tarde.',
        [{ text: 'OK' }]
      );
    }
    setIsProcessing(false);
  };
  
  // Effect for handling app state changes and URL parameters 
  useEffect(() => {
    const handleStatusCheck = async (orderToCheck: number) => {
      setIsProcessing(true);
      const isPaid = await checkOrderStatus(orderToCheck);
      processPaymentOutcome(isPaid, orderToCheck);
    };

    if (urlOrderId) {
      console.log('URL order ID detected:', urlOrderId);
      try {
        const numOrderId = typeof urlOrderId === 'string' ? parseInt(urlOrderId) : 
                          Array.isArray(urlOrderId) ? parseInt(urlOrderId[0]) : Number(urlOrderId);
        
        if (!isNaN(numOrderId)) {
          console.log('Setting order ID and checking status for:', numOrderId);
          setOrderId(numOrderId);
          
          paymentAttemptedRef.current = true;
          handleStatusCheck(numOrderId);
        }
      } catch (err) {
        console.error('Error parsing order ID:', err);
        setIsProcessing(false);
      }
    }
    
    if (appStateListenerRef.current) {
      appStateListenerRef.current.remove();
    }
    
    appStateListenerRef.current = AppState.addEventListener('change', nextAppState => {
      console.log(`App state changed from ${appState.current} to ${nextAppState}`);
      
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        paymentAttemptedRef.current && 
        orderId
      ) {
        if (isProcessing) {
          console.log('Already processing, skipping additional status check');
          return;
        }
        
        console.log('App returned to foreground. Checking status for order:', orderId);
        handleStatusCheck(orderId);
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });
    
    return () => {
      if (appStateListenerRef.current) {
        appStateListenerRef.current.remove();
      }
    };
  }, [urlOrderId, returnToApp, orderId, clearCart, processPaymentOutcome]);
  
  const handlePlaceOrder = async () => {
    console.log(`[CheckoutScreen] handlePlaceOrder triggered. Current isProcessing: ${isProcessing}, items count: ${items.length}`);

    if (isProcessing) {
      console.log('[CheckoutScreen] Already processing, returning.');
      Alert.alert('Procesando', 'Tu pedido ya está siendo procesado. Por favor espera.');
      return;
    }

    if (items.length === 0) {
      console.log('[CheckoutScreen] Empty cart, returning.');
      Alert.alert('Carrito Vacío', 'Por favor agrega productos a tu carrito antes de proceder al pago.');
      return;
    }
    
    console.log('[CheckoutScreen] IMMEDIATELY SETTING isProcessing = true');
    setIsProcessing(true); 

    await new Promise(resolve => setTimeout(resolve, 0)); 

    try {
      console.log('[CheckoutScreen] Starting order creation API call. isProcessing should be true now.');
      const orderItems = items.map(item => ({
        menuItemId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations || {}
      }));

      console.log('[CheckoutScreen] Attempting to create order with items:', JSON.stringify(orderItems));
      console.log('[CheckoutScreen] Attempting to create order with total:', total);

      const response = await orderAPI.createOrder({
        items: orderItems,
        collectionTime: "",
        total: total
      });
      console.log('[CheckoutScreen] orderAPI.createOrder response:', response?.order?.id);

      if (response && response.order && response.order.id) {
        const createdOrderId = response.order.id;
        setOrderId(createdOrderId); 
        
        console.log(`[CheckoutScreen] Navigating to payment-webview for orderId: ${createdOrderId}`);
        router.push({
          pathname: '/payment-webview',
          params: { orderId: createdOrderId.toString() }
        });
        
        clearCart();
      } else {
        console.error('[CheckoutScreen] Invalid response from orderAPI.createOrder:', response);
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error: any) {
      console.error('[CheckoutScreen] Error in handlePlaceOrder:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Error desconocido al crear el pedido';
      Alert.alert(
        'Error al Procesar Pedido',
        `Hubo un problema al procesar tu pedido: ${errorMessage}. Por favor intenta de nuevo.`,
        [{ text: 'OK' }]
      );
    } finally {
      console.log('[CheckoutScreen] Setting isProcessing = false in finally block');
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing) {
      return 'Procesando...';
    }
    return 'Realizar Pedido';
  }

  const goToConfirmation = () => {
    if (orderId) {
      router.push({
        pathname: '/order-confirmation',
        params: { orderId: orderId.toString() }
      });
    }
  };

  const renderItems = () => {
    return items.map((item, index) => {
      const key = `${item.id}-${index}-${JSON.stringify(item.customizations)}`;
      
      return (
        <Card key={key} className="mb-3" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-4">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-lg mb-1" style={{ color: '#FFFFFF' }}>
                  {item.name}
                </Text>
                
                {item.customizations && (
                  <View className="mt-2">
                    {item.customizations.extras && item.customizations.extras.length > 0 && (
                      <View className="flex-row items-center mb-1">
                        <Plus size={12} color="#FAB10A" className="mr-1" />
                        <Text className="text-xs" style={{ color: '#CCCCCC' }}>
                          Extras: {item.customizations.extras.join(', ')}
                        </Text>
                      </View>
                    )}
                    
                    {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                      <View className="flex-row items-center mb-1">
                        <Plus size={12} color="#FAB10A" className="mr-1" />
                        <Text className="text-xs" style={{ color: '#CCCCCC' }}>
                          Salsas: {item.customizations.sauces.join(', ')}
                        </Text>
                      </View>
                    )}
                    
                    {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                      <View className="flex-row items-center mb-1">
                        <Plus size={12} color="#FAB10A" className="mr-1" />
                        <Text className="text-xs" style={{ color: '#CCCCCC' }}>
                          Ingredientes: {item.customizations.toppings.join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              <View className="items-end">
                <Badge className="mb-2" style={{ backgroundColor: '#333333' }}>
                  <Text className="text-xs font-medium" style={{ color: '#FFFFFF' }}>
                    x{item.quantity}
                  </Text>
                </Badge>
                <Text className="font-bold text-lg" style={{ color: '#FAB10A' }}>
                  €{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      );
    });
  };

  console.log('[CheckoutScreen] Rendering - isProcessing:', isProcessing);
  console.log('[CheckoutScreen] Rendering - items:', JSON.stringify(items));

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Pagar',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
        }}
      />
      
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
        <View className="flex-1" style={{ backgroundColor: '#000000' }}>
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom + 80, 120),
            paddingHorizontal: 16
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardHeader>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FAB10A' }}>
                  <ShoppingCart size={24} color="#000000" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                    Resumen del Pedido
                  </Text>
                  <Text className="text-sm" style={{ color: '#CCCCCC' }}>
                    Revisa tu pedido antes de pagar
                  </Text>
                </View>
              </View>
            </CardHeader>
          </Card>

          {/* Order Items */}
          <View className="mb-6">
            {renderItems()}
          </View>

          {/* Order Total */}
          <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <CardContent className="p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-medium" style={{ color: '#CCCCCC' }}>
                  Subtotal:
                </Text>
                <Text className="text-lg font-medium" style={{ color: '#FFFFFF' }}>
                  €{total.toFixed(2)}
                </Text>
              </View>
              
              <Separator style={{ backgroundColor: '#333333', marginVertical: 16 }} />
              
              <View className="flex-row justify-between items-center">
                <Text className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  Total:
                </Text>
                <Text className="text-2xl font-bold" style={{ color: '#FAB10A' }}>
                  €{total.toFixed(2)}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Processing State */}
          {isProcessing && (
            <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#FAB10A' }}>
              <CardContent className="p-6 items-center">
                <ActivityIndicator size="large" color="#FAB10A" className="mb-4" />
                <Text className="text-lg font-medium mb-2" style={{ color: '#FFFFFF' }}>
                  Procesando tu pedido...
                </Text>
                <Text className="text-sm text-center" style={{ color: '#CCCCCC' }}>
                  Estamos creando tu pedido y preparando el pago
                </Text>
              </CardContent>
            </Card>
          )}
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View 
          className="absolute bottom-0 left-0 right-0 px-4 pt-4"
          style={{ 
            backgroundColor: '#000000', 
            paddingBottom: Math.max(insets.bottom + 56, 96),
            borderTopWidth: 1,
            borderTopColor: '#333333'
          }}
        >
          <Button
            onPress={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            className="w-full flex-row items-center justify-center py-4"
            style={{ 
              backgroundColor: isProcessing || items.length === 0 ? '#666666' : '#FAB10A',
              opacity: isProcessing || items.length === 0 ? 0.6 : 1
            }}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#000000" className="mr-2" />
                <Text className="font-bold text-lg" style={{ color: '#000000' }}>
                  Procesando...
                </Text>
              </>
            ) : (
              <>
                <CreditCard size={20} color="#000000" className="mr-2" />
                <Text className="font-bold text-lg" style={{ color: '#000000' }}>
                  Realizar Pedido
                </Text>
              </>
            )}
          </Button>
        </View>
        </View>
      </SafeAreaView>
    </>
  );
}
