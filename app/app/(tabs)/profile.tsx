import { StyleSheet, FlatList, ActivityIndicator, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { orderAPI } from '@/services/api'; // Assuming this is the correct path
import { Colors } from '@/constants/Colors'; // For styling
import { useColorScheme } from '@/hooks/useColorScheme';

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  menuItem?: {
    name: string;
  };
  customizations?: string; // Assuming customizations is a JSON string
}

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  // Add other relevant fields from your Order model
}

export default function ProfileScreen() {
  const { user, isLoggedIn, logout } = useAuth(); // Assuming useAuth provides the user object with an id
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

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
      // Ensure user.id is treated as a number if your API expects that
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
    setOrders([]); // Clear orders on logout
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={{ flex: 1, padding: 16, paddingTop: insets.top }}>
        <ThemedText style={styles.message}>
          Please log in to view your profile and order history
        </ThemedText>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <ThemedText style={styles.buttonText}>Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItemContainer}>
      <ThemedText style={styles.orderItemText}>
        {item.quantity} x {item.menuItem?.name || `Item ID: ${item.menuItemId}`}
      </ThemedText>
      <ThemedText style={styles.orderItemPrice}>
        Price: ${(item.price * item.quantity).toFixed(2)}
      </ThemedText>
      {item.customizations && (
        <ThemedText style={styles.orderItemCustomizations}>
          Customizations: {typeof item.customizations === 'string' ? item.customizations : JSON.stringify(item.customizations)}
        </ThemedText>
      )}
    </View>
  );

  const renderOrderCard = ({ item }: { item: Order }) => (
    <ThemedView style={[
      styles.orderCard,
      {
        backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
        borderColor: Colors[colorScheme ?? 'light'].icon
      }
    ]}>
      <View style={styles.orderHeader}>
        <ThemedText style={styles.orderId}>Order #{item.id}</ThemedText>
        <ThemedText style={styles.orderDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>
      <View style={styles.orderItemsList}>
        {item.items.map(orderItem => (
          <View key={orderItem.id}> 
            {renderOrderItem({ item: orderItem })}
          </View>
        ))}
      </View>
      <View style={styles.orderFooter}>
        <ThemedText style={styles.orderStatus}>Status: {item.status}</ThemedText>
        <ThemedText style={styles.orderTotal}>Total: ${item.total.toFixed(2)}</ThemedText>
      </View>
    </ThemedView>
  );

  const ListHeader = () => (
    <ThemedView style={styles.listHeaderFooterContainer}>
      <ThemedView style={[styles.headerContainer, { marginTop: insets.top / 2 }]}>
        <IconSymbol
          size={80}
          color={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
          name="person.circle"
          style={styles.headerIcon}
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Account Details</ThemedText>
        {user && <ThemedText>Email: {user.email}</ThemedText>}
        {/* Add other user details here once we have them from the backend */}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Loyalty Points</ThemedText>
        <ThemedText>You have {user?.loyaltyPoints || 0} points</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Order History</ThemedText>
      </ThemedView>
    </ThemedView>
  );

  const ListFooter = () => (
    <ThemedView style={styles.listHeaderFooterContainer}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <ThemedText style={styles.buttonText}>Logout</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const ListEmpty = () => (
    <ThemedView style={styles.emptyListContainer}>
      {isLoadingOrders ? (
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} style={{ marginTop: 20 }} />
      ) : orderError ? (
        <ThemedText style={styles.errorText}>{orderError}</ThemedText>
      ) : (
        <ThemedText>You haven't placed any orders yet.</ThemedText>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.screenContainer, {paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        data={orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
        renderItem={renderOrderCard}
        keyExtractor={(order) => order.id.toString()}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[styles.ordersListContainer, styles.flatListContentContainer]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  ordersListContainer: {
    paddingBottom: 20,
  },
  flatListContentContainer: {
    paddingHorizontal: 16,
  },
  listHeaderFooterContainer: {
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  orderCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
  },
  orderItemsList: {
    marginBottom: 12,
  },
  orderItemContainer: {
    paddingVertical: 6,
  },
  orderItemText: {
    fontSize: 14,
  },
  orderItemPrice: {
    fontSize: 13,
    opacity: 0.8,
  },
  orderItemCustomizations: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
