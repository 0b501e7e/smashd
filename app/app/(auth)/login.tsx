import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Lock, LogIn, User } from 'lucide-react-native';

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
      router.replace('/(tabs)/promotions'); // Redirect to promotions after login
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
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          justifyContent: 'center',
          minHeight: '100%',
        }}
      >
        {/* Header Section */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#FAB10A' }}>
            <User size={40} color="#000000" />
          </View>
          <Text className="text-4xl font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
            Bienvenido
          </Text>
          <Text className="text-center text-base leading-6" style={{ color: '#CCCCCC' }}>
            Inicia sesión para continuar con SMASHD
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <Card className="mb-8" style={{ borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.1)' }}>
            <View className="p-4">
              <Text className="text-center font-medium" style={{ color: '#FF4444' }}>
                {error}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Login Form */}
        <Card className="mb-8" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-8">
            <View className="gap-6">
              <View className="gap-3">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Email
                </Label>
                <View className="flex-row items-center rounded-md px-4 h-14" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Mail size={18} color="#CCCCCC" />
                  <Input
                    placeholder="tu@email.com"
                    placeholderTextColor="#666666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 ml-3 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>

              <View className="gap-3">
                <Label className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Contraseña
                </Label>
                <View className="flex-row items-center rounded-md px-4 h-14" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
                  <Lock size={18} color="#CCCCCC" />
                  <Input
                    placeholder="Tu contraseña"
                    placeholderTextColor="#666666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="flex-1 ml-3 border-0 p-0 h-auto bg-transparent"
                    style={{ color: '#FFFFFF' }}
                  />
                </View>
              </View>

              <View className="items-end">
                <Link href="/forgot-password" asChild>
                  <Button variant="link" className="p-0 h-auto">
                    <Text className="text-sm font-medium" style={{ color: '#FAB10A' }}>
                      ¿Olvidaste tu contraseña?
                    </Text>
                  </Button>
                </Link>
              </View>
            </View>
          </View>
        </Card>

        {/* Login Button */}
        <Button
          className="h-16 mb-8"
          style={{ backgroundColor: '#FAB10A' }}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color="#000000" size="small" />
              <Text className="text-lg font-semibold" style={{ color: '#000000' }}>
                Iniciando sesión...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-3">
              <LogIn size={22} color="#000000" />
              <Text className="text-lg font-semibold" style={{ color: '#000000' }}>
                Iniciar Sesión
              </Text>
            </View>
          )}
        </Button>

        {/* Register Link */}
        <Card style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-5">
            <View className="flex-row justify-center items-center gap-2">
              <Text style={{ color: '#CCCCCC' }}>
                ¿No tienes cuenta?
              </Text>
              <Link href="/register" asChild>
                <Button variant="link" className="p-0 h-auto">
                  <Text className="font-semibold" style={{ color: '#FAB10A' }}>
                    Registrarse
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
