import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import useColorScheme from NativeWind
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { RootStoreProvider } from '../contexts/RootStoreContext';
import { checkGuestMode } from '../services/api';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      // Add a delay to ensure the splash screen shows for a reasonable time
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 1500); // Show splash for 1.5 seconds
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize guest mode check with basic error handling
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        await checkGuestMode();
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <RootStoreProvider>
      <AuthProvider>
        <CartProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ 
                  headerShown: false,
                  headerStyle: {
                    backgroundColor: '#000',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    color: '#fff',
                    fontWeight: 'bold',
                  },
                }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Finalizar Pedido' }} />
                  <Stack.Screen name="item-customization" options={{ headerShown: true, title: 'Personalizar' }} />
                  <Stack.Screen name="order-confirmation" options={{ headerShown: true, title: 'Pedido Confirmado' }} />
                  <Stack.Screen name="payment-webview" options={{ headerShown: true, title: 'Pagar' }} />
                  <Stack.Screen name="waiting-for-confirmation" options={{ headerShown: true, title: 'Procesando...' }} />
                  <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Página No Encontrada' }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </CartProvider>
      </AuthProvider>
    </RootStoreProvider>
  );
}
