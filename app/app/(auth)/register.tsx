import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { router, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhoneNumber = (phone: string) => {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const formatDateOfBirth = (date: Date) => {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleRegister = async () => {
    // Reset error state
    setError('');

    // Validate inputs
    if (!name || !email || !password || !confirmPassword || !address || !phoneNumber) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (name.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (address.length < 5) {
      setError('La dirección debe tener al menos 5 caracteres');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Por favor ingresa un número de teléfono válido');
      return;
    }

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones para registrarte');
      return;
    }

    // Check age (must be at least 13 years old)
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    if (age < 13) {
      setError('Debes tener al menos 13 años para registrarte');
      return;
    }

    setIsLoading(true);

    try {
      await register(
        email, 
        password, 
        name, 
        formatDateOfBirth(dateOfBirth), 
        address, 
        phoneNumber, 
        acceptedTerms
      );
      router.replace('/'); // Redirect to main app after registration
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = (err as any).response?.data?.error;
        setError(apiError || 'El registro falló. Por favor intenta de nuevo.');
      } else {
        setError('Ocurrió un error. Por favor intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Registrarse' }} />
      <ScrollView>
        <ThemedView style={[
          styles.container, 
          { 
            paddingTop: insets.top,
            paddingBottom: insets.bottom 
          }
        ]}>
          <ThemedText style={styles.title}>Crea tu Cuenta</ThemedText>
          
          {error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Nombre Completo"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <ThemedText style={styles.dateButtonText}>
              Fecha de Nacimiento: {dateOfBirth.toLocaleDateString('es-ES')}
            </ThemedText>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Número de Teléfono"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.multilineInput}
            placeholder="Dirección"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <ThemedView style={[
              styles.checkbox, 
              acceptedTerms && styles.checkboxChecked
            ]} />
            <ThemedText style={styles.checkboxText}>
              Acepto los términos y condiciones
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.buttonText}>Registrarse</ThemedText>
            )}
          </TouchableOpacity>

          <ThemedView style={styles.loginContainer}>
            <ThemedText>¿Ya tienes cuenta? </ThemedText>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.loginLink}>Iniciar Sesión</ThemedText>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 12,
    minHeight: 800,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  multilineInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  dateButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  dateButtonText: {
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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
    marginBottom: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginLink: {
    color: '#0a7ea4',
    fontWeight: 'bold',
  },
}); 