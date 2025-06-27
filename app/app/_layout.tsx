import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Import useColorScheme from NativeWind
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { RootStoreProvider } from '../contexts/RootStoreContext';
import { checkGuestMode } from '../services/api';
import '../global.css';

// Initialize Sentry for crash reporting (CRITICAL for debugging production crashes)
try {
  Sentry.init({
    dsn: 'https://8416e6426e3e2c2216029e65ac188669@o4509569219821568.ingest.de.sentry.io/4509569221525584', // Your real Sentry DSN
    debug: __DEV__, // Enable debug mode in development
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      // Log crashes to console in development
      if (__DEV__) {
        console.error('SENTRY CRASH REPORT:', event);
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Log breadcrumbs in development
      if (__DEV__) {
        console.log('SENTRY BREADCRUMB:', breadcrumb);
      }
      return breadcrumb;
    }
  });
  
  // Add custom context
  Sentry.setTag('app.version', '1.0.3');
  Sentry.setTag('app.environment', __DEV__ ? 'development' : 'production');
  
  console.log('✅ Sentry initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Sentry:', error);
}

// Enhanced error boundary and global error handler
const originalConsoleError = console.error;
console.error = (...args) => {
  // Log to Sentry
  Sentry.captureException(new Error(args.join(' ')));
  
  // Call original console.error
  originalConsoleError(...args);
};

// Global unhandled promise rejection handler
const handleUnhandledRejection = (event: any) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
  Sentry.captureException(new Error(`Unhandled Promise Rejection: ${event.reason}`));
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

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

  useEffect(() => {
    // Initialize guest mode check with error handling
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        
        // Add breadcrumb for app initialization
        Sentry.addBreadcrumb({
          message: 'App initialization started',
          level: 'info',
          category: 'app'
        });
        
        await checkGuestMode();
        
        console.log('✅ App initialized successfully');
        Sentry.addBreadcrumb({
          message: 'App initialization completed',
          level: 'info',
          category: 'app'
        });
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        Sentry.captureException(error, {
          tags: {
            section: 'app_initialization'
          }
        });
      }
    };

    initializeApp();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        console.error('🚨 ROOT ERROR BOUNDARY TRIGGERED:', error);
        
        return (
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: '#FAB10A',
                  padding: 20
                }}>
                  <Text style={{ 
                    fontSize: 20, 
                    fontWeight: 'bold', 
                    marginBottom: 20,
                    textAlign: 'center',
                    color: '#000'
                  }}>
                    ¡Oops! Algo salió mal
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    marginBottom: 30,
                    textAlign: 'center',
                    color: '#333'
                  }}>
                    La aplicación encontró un error. Por favor reinicia la app.
                  </Text>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#000',
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 5
                    }}
                    onPress={resetError}
                  >
                    <Text style={{ color: '#FAB10A', fontSize: 16 }}>
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
                <StatusBar style="auto" />
              </ThemeProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        );
      }}
      beforeCapture={(scope, error) => {
        console.error('🚨 CAPTURING ERROR TO SENTRY:', error);
        scope.setTag('errorBoundary', 'root');
        return scope;
      }}
    >
      <RootStoreProvider>
        <AuthProvider>
          <CartProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                </ThemeProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </CartProvider>
        </AuthProvider>
      </RootStoreProvider>
    </Sentry.ErrorBoundary>
  );
}
