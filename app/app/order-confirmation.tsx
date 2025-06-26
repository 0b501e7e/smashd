import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderAPI } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/IconSymbol';

type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'CONFIRMED';

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
    if (!orderId || !order || (order.status === 'COMPLETED' || order.status === 'CANCELLED')) {
      return; // Don't poll if no order, or order is in a terminal state
    }

    const numOrderId = Number(orderId);
    if (isNaN(numOrderId)) return;

    const intervalId = setInterval(async () => {
      try {
        console.log(`Polling for status update on order ${numOrderId}`);
        const updatedOrderDetails = await orderAPI.getOrderStatus(numOrderId);
        setOrder(updatedOrderDetails);
        // Optional: Haptic feedback for significant status changes if desired
        // if (order && updatedOrderDetails.status !== order.status && (updatedOrderDetails.status === 'PREPARING' || updatedOrderDetails.status === 'READY')) {
        //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // }
      } catch (error) {
        console.error('Error polling order status:', error);
        // Decide if we want to show a non-blocking error to the user, e.g., a small toast
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or when dependencies change
  }, [orderId, order]); // Re-run if orderId changes or order data (like status) changes
  
  // Format estimated ready time
  const getEstimatedReadyTime = () => {
    if (!order || !order.createdAt) return 'Unknown';
    
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
      return 'Unknown';
    }
  };
  
  // Get status color and icon based on order status
  const getStatusInfo = () => {
    if (!order) return { color: '#ccc', icon: 'clock', text: 'Desconocido' };
    
    switch (order.status) {
      case 'PAID':
        return { color: '#4caf50', icon: 'checkmark.circle.fill', text: 'Pago Confirmado' };
      case 'CONFIRMED':
        return { color: '#ff9800', icon: 'flame.fill', text: 'Pedido Confirmado, ¡Preparándose!' };
      case 'PREPARING':
        return { color: '#ff9800', icon: 'flame.fill', text: 'Preparando tu Pedido' };
      case 'READY':
        return { color: '#2196f3', icon: 'bell.fill', text: 'Listo para Recoger' };
      case 'COMPLETED':
        return { color: '#4caf50', icon: 'checkmark.circle.fill', text: 'Pedido Completado' };
      case 'CANCELLED':
        return { color: '#f44336', icon: 'xmark.circle.fill', text: 'Pedido Cancelado' };
      default:
        return { color: '#ff9800', icon: 'clock', text: 'Procesando' };
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerTitle: 'Confirmación de Pedido' }} />
        <ActivityIndicator size="large" color="#ff8c00" />
        <ThemedText style={styles.loadingText}>Cargando detalles del pedido...</ThemedText>
      </ThemedView>
    );
  }
  
  // Error state
  if (error || !order) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerTitle: 'Error del Pedido' }} />
        <IconSymbol name="exclamationmark.triangle.fill" size={60} color="#f44336" />
        <ThemedText style={styles.errorText}>
          {error || 'No se pudieron cargar los detalles del pedido'}
        </ThemedText>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <ThemedText style={styles.buttonText}>Volver a la Carta</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Success state - order details
  const statusInfo = getStatusInfo();
  
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerTitle: 'Confirmación de Pedido' }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.header}>
          <IconSymbol name="checkmark.circle.fill" size={80} color="#4caf50" />
          <ThemedText type="title" style={styles.headerTitle}>
            ¡Gracias por tu Pedido!
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Tu pedido ha sido confirmado y pagado.
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.orderInfo}>
          <ThemedView style={styles.orderInfoRow}>
            <ThemedText style={styles.orderInfoLabel}>Número de Pedido:</ThemedText>
            <ThemedText style={styles.orderInfoValue}>#{order.id}</ThemedText>
          </ThemedView>
          
          {transactionId && (
            <ThemedView style={styles.orderInfoRow}>
              <ThemedText style={styles.orderInfoLabel}>ID de Transacción:</ThemedText>
              <ThemedText style={styles.orderInfoValue}>{transactionId}</ThemedText>
            </ThemedView>
          )}
          
          <ThemedView style={styles.orderInfoRow}>
            <ThemedText style={styles.orderInfoLabel}>Estado:</ThemedText>
            <ThemedView style={styles.statusContainer}>
              <IconSymbol name={statusInfo.icon} size={20} color={statusInfo.color} />
              <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.orderInfoRow}>
            <ThemedText style={styles.orderInfoLabel}>Tiempo Estimado:</ThemedText>
            <ThemedText style={styles.orderInfoValue}>
              {getEstimatedReadyTime()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.itemsContainer}>
          <ThemedText type="subtitle" style={styles.itemsTitle}>
            Productos Pedidos
          </ThemedText>
          
          {order.items.map((item, index) => (
            <ThemedView key={index} style={styles.item}>
              <ThemedView style={styles.itemHeader}>
                <ThemedText style={styles.itemName}>
                  {item.quantity}x {item.name}
                </ThemedText>
                <ThemedText style={styles.itemPrice}>
                  €{(item.price * item.quantity).toFixed(2)}
                </ThemedText>
              </ThemedView>
              
              {item.customizations && Object.keys(item.customizations).length > 0 && (
                <ThemedView style={styles.customizations}>
                  <ThemedText style={styles.customizationText}>
                    Personalizaciones: {JSON.stringify(item.customizations)}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          ))}
          
          <ThemedView style={styles.totalContainer}>
            <ThemedText type="subtitle" style={styles.totalText}>
              Total: €{order.total.toFixed(2)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        <ThemedView style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <ThemedText style={styles.primaryButtonText}>Ver Historial de Pedidos</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <ThemedText style={styles.secondaryButtonText}>Hacer Otro Pedido</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  orderInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderSummary: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customizationsContainer: {
    marginTop: 4,
  },
  customizationText: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  instructions: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff8c00', 
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noItemsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemsContainer: {
    marginBottom: 24,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  item: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#ff8c00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#2196f3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
