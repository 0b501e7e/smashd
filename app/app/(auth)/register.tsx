import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Calendar, User, Mail, Phone, MapPin, Lock, CheckCircle } from 'lucide-react-native';

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
      router.replace('/(tabs)/promotions'); // Redirect to promotions after registration
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
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        {/* Header Section */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FAB10A' }}>
            <User size={32} color="#000000" />
          </View>
          <Text className="text-3xl font-bold text-center mb-2" style={{ color: '#FFFFFF' }}>
            Crea tu Cuenta
          </Text>
          <Text className="text-center text-base leading-6" style={{ color: '#CCCCCC' }}>
            Únete a SMASHD y disfruta de los mejores burgers
          </Text>
        </View>
        
        {/* Error Message */}
        {error ? (
          <Card className="mb-6" style={{ borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.1)' }}>
            <View className="p-4">
              <Text className="text-center font-medium" style={{ color: '#FF4444' }}>
                {error}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Personal Information Section */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-6">
            <View className="flex-row items-center mb-4">
              <User size={20} color="#CCCCCC" />
              <Text className="text-lg font-semibold ml-2" style={{ color: '#FFFFFF' }}>
                Información Personal
              </Text>
            </View>
            
            <View className="gap-4">
              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Nombre Completo
                </Label>
                <Input
                  placeholder="Ingresa tu nombre completo"
                  placeholderTextColor="#666666"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  className="h-12"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', color: '#FFFFFF' }}
                />
              </View>

              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Email
                </Label>
                <View className="flex-row items-center rounded-md px-3 h-12" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Mail size={16} color="#CCCCCC" />
                  <Input
                    placeholder="tu@email.com"
                    placeholderTextColor="#666666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 ml-2 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>

              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Fecha de Nacimiento
                </Label>
                <Button 
                  variant="outline"
                  className="h-12 justify-start"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333' }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#CCCCCC" />
                    <Text className="ml-2" style={{ color: '#FFFFFF' }}>
                      {dateOfBirth.toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </Button>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Contact Information Section */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-6">
            <View className="flex-row items-center mb-4">
              <Phone size={20} color="#CCCCCC" />
              <Text className="text-lg font-semibold ml-2" style={{ color: '#FFFFFF' }}>
                Información de Contacto
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Número de Teléfono
                </Label>
                <View className="flex-row items-center rounded-md px-3 h-12" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Phone size={16} color="#CCCCCC" />
                  <Input
                    placeholder="+34 600 000 000"
                    placeholderTextColor="#666666"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    className="flex-1 ml-2 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>

              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Dirección
                </Label>
                <View className="flex-row items-start rounded-md px-3 py-3 min-h-20" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <MapPin size={16} color="#CCCCCC" className="mt-1" />
                  <Input
                    placeholder="Calle, número, ciudad"
                    placeholderTextColor="#666666"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={3}
                    className="flex-1 ml-2 border-0 p-0 h-auto bg-transparent"
                    textAlignVertical="top"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Security Section */}
        <Card className="mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-6">
            <View className="flex-row items-center mb-4">
              <Lock size={20} color="#CCCCCC" />
              <Text className="text-lg font-semibold ml-2" style={{ color: '#FFFFFF' }}>
                Seguridad
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Contraseña
                </Label>
                <View className="flex-row items-center rounded-md px-3 h-12" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Lock size={16} color="#CCCCCC" />
                  <Input
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#666666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="flex-1 ml-2 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>

              <View className="gap-2">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Confirmar Contraseña
                </Label>
                <View className="flex-row items-center rounded-md px-3 h-12" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Lock size={16} color="#CCCCCC" />
                  <Input
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#666666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    className="flex-1 ml-2 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Terms and Conditions */}
        <Card className="mb-8" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-6">
            <View className="flex-row items-start gap-3">
              <Checkbox 
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
                className="mt-1"
              />
              <View className="flex-1">
                <Text className="text-sm leading-6" style={{ color: '#FFFFFF' }}>
                  Acepto los{' '}
                  <Text className="font-medium" style={{ color: '#FAB10A' }}>
                    términos y condiciones
                  </Text>
                  {' '}y la{' '}
                  <Text className="font-medium" style={{ color: '#FAB10A' }}>
                    política de privacidad
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Register Button */}
        <Button 
          className="h-14 mb-6"
          style={{ backgroundColor: '#FAB10A' }}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#000000" size="small" />
              <Text className="text-base font-semibold" style={{ color: '#000000' }}>
                Creando cuenta...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <CheckCircle size={20} color="#000000" />
              <Text className="text-base font-semibold" style={{ color: '#000000' }}>
                Crear Cuenta
              </Text>
            </View>
          )}
        </Button>

        {/* Login Link */}
        <Card style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-4">
            <View className="flex-row justify-center items-center gap-2">
              <Text style={{ color: '#CCCCCC' }}>
                ¿Ya tienes cuenta?
              </Text>
              <Link href="/login" asChild>
                <Button variant="link" className="p-0 h-auto">
                  <Text className="font-semibold" style={{ color: '#FAB10A' }}>
                    Iniciar Sesión
                  </Text>
                </Button>
              </Link>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
} 