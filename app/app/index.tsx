import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { setGuestMode } from '@/services/api';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { isLoggedIn, loading } = useAuth();

  // Redirect to menu if already logged in
  useEffect(() => {
    if (isLoggedIn && !loading) {
      router.replace('/(tabs)/promotions');
    }
  }, [isLoggedIn, loading]);

  const handleGuestMode = async () => {
    // Enable guest mode and navigate to menu
    setGuestMode(true);
    
    // Add a small delay to ensure guest mode is properly set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    router.replace('/(tabs)/promotions');
  };

  // Don't render anything while checking auth status
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <AnimatedLogo />
        <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaProvider>
    <ThemedView style={styles.container}>
      <AnimatedLogo />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/login')}>
          <ThemedText style={styles.buttonText}>INICIAR SESIÓN</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/register')}>
          <ThemedText style={styles.buttonText}>REGISTRARSE</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.guestButton]}
          onPress={handleGuestMode}>
          <ThemedText style={styles.buttonText}>CONTINUAR COMO INVITADO</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAB10A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#000',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  guestButton: {
    backgroundColor: '#333',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFE4B5',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
