import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Home, Menu, ShoppingCart, User, Truck } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { items } = useCart();
  const { user } = useAuth();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isDriver = user?.role === 'DRIVER';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      {/* Customer tabs - hidden for drivers */}
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
          href: isDriver ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Carta',
          tabBarIcon: ({ color }) => <Menu size={28} color={color} />,
          href: isDriver ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color }) => (
            <View>
              <ShoppingCart size={28} color={color} />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 flex items-center justify-center">
                  <Text>{itemCount}</Text>
                </Badge>
              )}
            </View>
          ),
          href: isDriver ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
          href: isDriver ? null : undefined,
        }}
      />
      {/* Driver tab - hidden for non-drivers */}
      <Tabs.Screen
        name="driver"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <Truck size={28} color={color} />,
          href: isDriver ? undefined : null,
        }}
      />
    </Tabs>
  );
}
