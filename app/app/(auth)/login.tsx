import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { router, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/'); // Redirect to main app after login
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err && 'response' in (err as any) && (err as any).response?.status === 401) {
        setError('Email o contraseña incorrectos');
      } else {
        setError('Ocurrió un error. Por favor intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Iniciar Sesión' }} />
      <ThemedView style={[
        styles.container, 
        { 
          paddingTop: insets.top,
          paddingBottom: insets.bottom 
        }
      ]}>
        {error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedView style={styles.registerContainer}>
          <ThemedText>¿No tienes cuenta? </ThemedText>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <ThemedText style={styles.registerLink}>Registrarse</ThemedText>
            </TouchableOpacity>
          </Link>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerLink: {
    color: '#0a7ea4',
    fontWeight: 'bold',
  },
});
