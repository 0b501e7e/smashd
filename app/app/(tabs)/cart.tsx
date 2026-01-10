import React from 'react';
import { View, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, LogIn } from 'lucide-react-native';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  const handleCheckout = () => {
    if (!isLoggedIn) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <View
        className="flex-1 justify-center items-center px-6"
        style={{
          backgroundColor: '#000000',
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left,
          paddingRight: insets.right
        }}
      >
        <View className="items-center">
          <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#111111' }}>
            <ShoppingCart size={48} color="#FAB10A" />
          </View>
          <Text className="text-2xl font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
            Tu carrito está vacío
          </Text>
          <Text className="text-center text-base leading-6 mb-8" style={{ color: '#CCCCCC' }}>
            Agrega algunos deliciosos burgers para comenzar
          </Text>
          <Button
            className="px-8 py-4"
            style={{ backgroundColor: '#FAB10A' }}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text className="font-semibold" style={{ color: '#000000' }}>
              Ver Carta
            </Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: '#000000',
        paddingLeft: insets.left,
        paddingRight: insets.right
      }}
    >
      {/* Header */}
      <View
        className="items-center py-6 px-6"
        style={{
          paddingTop: insets.top + 20,
          backgroundColor: '#FAB10A'
        }}
      >
        <Text className="text-3xl font-bold" style={{ color: '#000000' }}>
          Tu Carrito
        </Text>
        <Text className="text-base mt-1" style={{ color: '#000000' }}>
          {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items */}
        <View className="gap-4 mb-6">
          {items.map((item, index) => (
            <Card
              key={`${item.id}-${index}-${JSON.stringify(item.customizations)}`}
              style={{ backgroundColor: '#111111', borderColor: '#333333' }}
            >
              <View className="p-5">
                {/* Item Header */}
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 mr-3">
                    <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                      {item.name}
                    </Text>
                    <Text className="text-base mt-1" style={{ color: '#FAB10A' }}>
                      €{item.price.toFixed(2)}
                    </Text>
                  </View>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    className="p-2"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      removeItem(item.id, item.customizations);
                    }}
                  >
                    <Trash2 size={20} color="#FF4444" />
                  </Button>
                </View>

                {/* Customizations */}
                {item.customizations && (
                  <View className="mb-4 py-3 px-3 rounded-md" style={{ backgroundColor: '#1A1A1A' }}>
                    {item.customizations.extras && item.customizations.extras.length > 0 && (
                      <View className="mb-2">
                        <Text className="text-sm font-medium" style={{ color: '#FAB10A' }}>
                          Extras:
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: '#CCCCCC' }}>
                          {item.customizations.extras.join(', ')}
                        </Text>
                      </View>
                    )}

                    {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                      <View className="mb-2">
                        <Text className="text-sm font-medium" style={{ color: '#FAB10A' }}>
                          Salsas:
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: '#CCCCCC' }}>
                          {item.customizations.sauces.join(', ')}
                        </Text>
                      </View>
                    )}

                    {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                      <View>
                        <Text className="text-sm font-medium" style={{ color: '#FAB10A' }}>
                          Ingredientes:
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: '#CCCCCC' }}>
                          {item.customizations.toppings.join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Quantity Controls */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Button
                      variant="outline"
                      className="w-10 h-10 p-0"
                      style={{
                        borderColor: '#333333',
                        backgroundColor: '#1A1A1A'
                      }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateQuantity(item.id, Math.max(0, item.quantity - 1), item.customizations);
                      }}
                    >
                      <Minus size={16} color="#FFFFFF" />
                    </Button>

                    <Text className="text-lg font-semibold min-w-8 text-center" style={{ color: '#FFFFFF' }}>
                      {item.quantity}
                    </Text>

                    <Button
                      variant="outline"
                      className="w-10 h-10 p-0"
                      style={{
                        borderColor: '#333333',
                        backgroundColor: '#1A1A1A'
                      }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateQuantity(item.id, item.quantity + 1, item.customizations);
                      }}
                    >
                      <Plus size={16} color="#FFFFFF" />
                    </Button>
                  </View>

                  <Text className="text-lg font-bold" style={{ color: '#FAB10A' }}>
                    €{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Total Section */}
        <Card style={{ backgroundColor: '#111111', borderColor: '#FAB10A', borderWidth: 2 }}>
          <View className="p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
                Total
              </Text>
              <Text className="text-3xl font-bold" style={{ color: '#FAB10A' }}>
                €{total.toFixed(2)}
              </Text>
            </View>

            <Button
              className="h-14"
              style={{ backgroundColor: '#FAB10A' }}
              onPress={handleCheckout}
            >
              <View className="flex-row items-center gap-3">
                {isLoggedIn ? (
                  <>
                    <CreditCard size={22} color="#000000" />
                    <Text className="text-lg font-semibold" style={{ color: '#000000' }}>
                      Proceder al Pago
                    </Text>
                  </>
                ) : (
                  <>
                    <LogIn size={22} color="#000000" />
                    <Text className="text-lg font-semibold" style={{ color: '#000000' }}>
                      Iniciar Sesión para Pagar
                    </Text>
                  </>
                )}
              </View>
            </Button>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
