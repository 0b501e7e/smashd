import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { useCart } from '@/contexts/CartContext';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Home, Menu, ShoppingCart, User } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Carta',
          tabBarIcon: ({ color }) => <Menu size={28} color={color} />,
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
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
