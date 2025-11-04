import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { orderAPI } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react-native';

// RNR Components
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Define the expected type for order status data
type OrderStatusData = {
  id: number;
  status: string; // PENDING, PAID, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
  // Add other fields if needed, but status is key here
};

export default function WaitingForConfirmationScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId; // Expecting orderId to be passed as a string
  
  const [loadingMessage, setLoadingMessage] = useState('Esperando confirmación del restaurante...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || typeof orderId !== 'string') {
      setError('El ID del pedido falta o es inválido.');
      console.error('WaitingForConfirmationScreen: Order ID is missing or invalid', orderId);
      return;
    }

    const numOrderId = Number(orderId);
    if (isNaN(numOrderId)) {
      setError('Formato de ID de pedido inválido.');
      console.error('WaitingForConfirmationScreen: Invalid Order ID format', orderId);
      return;
    }

    console.log(`WaitingForConfirmationScreen: Polling for order ${numOrderId}`);

    const intervalId = setInterval(async () => {
      try {
        const orderStatusData: OrderStatusData = await orderAPI.getOrderStatus(numOrderId);
        console.log(`WaitingForConfirmationScreen: Order ${numOrderId} status: ${orderStatusData.status}`);

        // Delivery orders go to READY, pickup orders go to CONFIRMED
        if (orderStatusData.status === 'CONFIRMED' || orderStatusData.status === 'READY') {
          clearInterval(intervalId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: '/order-confirmation',
            params: { orderId: orderId }, // Pass orderId as string
          });
        } else if (orderStatusData.status === 'CANCELLED' || orderStatusData.status === 'DECLINED_BY_RESTAURANT') {
          clearInterval(intervalId);
          setError('Lamentablemente, tu pedido no pudo ser confirmado por el restaurante. Por favor contáctanos para asistencia.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        // Continue polling for other statuses like PENDING, PAID
      } catch (err: any) {
        console.error(`WaitingForConfirmationScreen: Error polling order status for ${numOrderId}:`, err);
      }
    }, 7000); // Poll every 7 seconds

    return () => clearInterval(intervalId); // Cleanup interval
  }, [orderId]);

  const handleGoToMenu = () => {
    router.push('/(tabs)/menu');
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#000000' }}>
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: '#000000' }}>
        
        {/* Main Content Card */}
        <Card className="w-full max-w-sm" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <CardContent className="p-8">
            
            {/* Icon and Loading */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FAB10A' }}>
                <Clock size={32} color="#000000" />
              </View>
              <ActivityIndicator size="large" color="#FAB10A" />
            </View>

            {/* Status Message */}
            <View className="items-center mb-6">
              <Text className="text-xl font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
                Confirmando Pedido
              </Text>
              <Text className="text-base text-center leading-6" style={{ color: '#CCCCCC' }}>
                {loadingMessage}
              </Text>
            </View>

            {/* Error State */}
            {error && (
              <Card className="mb-6" style={{ borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.1)' }}>
                <View className="p-4 flex-row items-start">
                  <AlertCircle size={20} color="#FF4444" className="mr-3 mt-1" />
                  <Text className="text-sm leading-6 flex-1" style={{ color: '#FF4444' }}>
                    {error}
                  </Text>
                </View>
              </Card>
            )}

            {/* Instructions */}
            <View className="items-center mb-6">
              <Text className="text-sm text-center" style={{ color: '#CCCCCC' }}>
                Por favor mantén esta pantalla abierta
              </Text>
            </View>

            {/* Action Buttons */}
            {error && (
              <Button 
                className="w-full h-12"
                style={{ backgroundColor: '#FAB10A' }}
                onPress={handleGoToMenu}
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>
                    Volver a la Carta
                  </Text>
                </View>
              </Button>
            )}

            {!error && (
              <View className="items-center">
                <View className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#333333' }}>
                  <View 
                    className="h-full rounded-full animate-pulse" 
                    style={{ 
                      backgroundColor: '#FAB10A',
                      width: '60%'
                    }} 
                  />
                </View>
                <Text className="text-xs mt-2" style={{ color: '#666666' }}>
                  Procesando...
                </Text>
              </View>
            )}

          </CardContent>
        </Card>

        {/* Bottom Info */}
        <View className="mt-8 items-center">
          <Text className="text-xs text-center" style={{ color: '#666666' }}>
            Tiempo estimado de confirmación: 2-5 minutos
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
} 