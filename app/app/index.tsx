import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { setGuestMode } from '@/services/api';

export default function HomeScreen() {
  const { isLoggedIn, loading } = useAuth();

  // Redirect to menu if already logged in
  useEffect(() => {
    if (isLoggedIn && !loading) {
      router.replace('/(tabs)/menu');
    }
  }, [isLoggedIn, loading]);

  const handleGuestMode = () => {
    // Enable guest mode and navigate to menu
    setGuestMode(true);
    router.push('/(tabs)/menu');
  };

  // Don't render anything while checking auth status
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>SMASH'D</ThemedText>
        <ThemedText style={styles.subtitle}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={[styles.title, { padding: 20, lineHeight: 48, height: 100 }]}>SMASH'D</ThemedText>
      <ThemedText style={styles.subtitle}>
        the best smash burgers in spain
      </ThemedText>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/login')}>
          <ThemedText style={styles.buttonText}>LOGIN</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/register')}>
          <ThemedText style={styles.buttonText}>REGISTER</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.guestButton]}
          onPress={handleGuestMode}>
          <ThemedText style={styles.buttonText}>CONTINUE AS GUEST</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffaf1c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 24,
    color: '#000',
    marginBottom: 20,
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
