import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { SumUpWrapper } from '../contexts/SumUpContext';
import { RootStoreProvider } from '../contexts/RootStoreContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootStoreProvider>
          <AuthProvider>
            <CartProvider>
              <SumUpWrapper>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack 
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { 
                        backgroundColor: colorScheme === 'dark' ? '#000' : '#fff'
                      }
                    }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen 
                      name="(tabs)" 
                      options={{
                        headerShown: false,
                        animation: 'slide_from_right',
                      }}
                    />
                    <Stack.Screen 
                      name="(auth)"
                      options={{
                        headerShown: false,
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen 
                      name="checkout"
                      options={{
                        headerShown: true,
                        animation: 'slide_from_right',
                      }}
                    />
                    <Stack.Screen 
                      name="order-confirmation"
                      options={{
                        headerShown: true,
                        animation: 'slide_from_right',
                      }}
                    />
                  </Stack>
                  <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                </ThemeProvider>
              </SumUpWrapper>
            </CartProvider>
          </AuthProvider>
        </RootStoreProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
