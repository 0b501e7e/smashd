import React from 'react';
import { View, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { setGuestMode, checkGuestMode } from '@/services/api';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  const { isLoggedIn, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const logoPosition = useRef(new Animated.Value(0)).current; // 0 = center, 1 = top
  const authOpacity = useRef(new Animated.Value(0)).current; // For auth options fade-in

  // Handle splash completion and logo animation
  useEffect(() => {
    const handleSplashCompletion = async () => {
      // Always show splash for at least 2.5 seconds
      const timer = setTimeout(async () => {
        // Start logo animation to move upwards
        Animated.parallel([
          Animated.timing(logoPosition, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(authOpacity, {
            toValue: 1,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]).start();
        
        setShowAuthOptions(true);

        // After showing the animation, check if we need to redirect
        if (!loading && isLoggedIn) {
          // If user is logged in, redirect after showing splash briefly
          setTimeout(() => {
            router.replace('/(tabs)/promotions');
          }, 1000); // Give 1 second to see the animation
        }
      }, 2500); // 2.5 seconds for splash branding

      return () => clearTimeout(timer);
    };

    handleSplashCompletion();
  }, []); // Remove dependencies to always show splash first

  // Separate effect to handle auth state changes after splash is shown
  useEffect(() => {
    if (showAuthOptions && !loading && isLoggedIn) {
      // Only redirect if user is actually logged in, not just for guest mode
      router.replace('/(tabs)/promotions');
    }
  }, [showAuthOptions, isLoggedIn, loading]);

  const handleGuestMode = async () => {
    // Enable guest mode and navigate to menu
    setGuestMode(true);
    
    // Add a small delay to ensure guest mode is properly set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    router.replace('/(tabs)/promotions');
  };

  // Single screen with animated logo transition
  return (
    <View 
      className="flex-1 p-4" 
      style={{ backgroundColor: '#FAB10A', paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Animated Logo Container */}
      <Animated.View 
        className="flex-1 justify-center items-center"
        style={{
          transform: [{
            translateY: logoPosition.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -120], // Move logo up by 120px
            })
          }]
        }}
      >
        <AnimatedLogo />
        
        <View className="mt-8">
          <Text className="text-4xl font-bold text-black text-center tracking-wider">
            SMASHD
          </Text>
          <Text className="text-lg text-black/80 text-center mt-2">
            Burgers Auténticos
          </Text>
          {!showAuthOptions && (
            <Text className="text-base text-black/60 text-center mt-4 font-medium">
              {loading ? 'Cargando...' : 'Bienvenido'}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Auth Options - Fade in after logo animation */}
      {showAuthOptions && !loading && (
        <Animated.View 
          className="w-full items-center gap-4 pb-8"
          style={{ opacity: authOpacity }}
        >
          {!isLoggedIn ? (
            <>
              <Text className="text-xl font-semibold text-black/80 text-center mb-2">
                ¡Comencemos!
              </Text>
              
              <Button 
                className="bg-black py-4 px-8 rounded-lg w-4/5"
                onPress={() => router.push('/(auth)/login')}
              >
                <Text className="text-yellow-100 text-lg font-bold">INICIAR SESIÓN</Text>
              </Button>

              <Button 
                className="bg-black py-4 px-8 rounded-lg w-4/5"
                onPress={() => router.push('/(auth)/register')}
              >
                <Text className="text-yellow-100 text-lg font-bold">REGISTRARSE</Text>
              </Button>

              <Button 
                className="bg-zinc-800 py-4 px-8 rounded-lg w-4/5 mt-2"
                onPress={handleGuestMode}
              >
                <Text className="text-yellow-100 text-lg font-bold">CONTINUAR COMO INVITADO</Text>
              </Button>
            </>
          ) : (
            <>
              <Text className="text-xl font-semibold text-black/80 text-center mb-2">
                ¡Bienvenido de vuelta!
              </Text>
              <Text className="text-base text-black/60 text-center mb-4">
                Redirigiendo...
              </Text>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}
