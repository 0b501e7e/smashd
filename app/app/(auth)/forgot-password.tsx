import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Send } from 'lucide-react-native';
import { authAPI } from '../../services/api';
import { router } from 'expo-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const onSubmit = async () => {
    setError('');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Ingresa un email válido');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setAlertOpen(true);
    } catch (e: any) {
      // Security best practice: show generic message
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#000000' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          minHeight: '100%',
        }}
      >
        <Card className="mb-8" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
          <View className="p-8">
            <Text className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              Recuperar contraseña
            </Text>
            <Text className="mb-6" style={{ color: '#CCCCCC' }}>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </Text>

            {error ? (
              <Card className="mb-4" style={{ borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.1)' }}>
                <View className="p-3">
                  <Text className="text-center" style={{ color: '#FF4444' }}>{error}</Text>
                </View>
              </Card>
            ) : null}

            <Label className="text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>Email</Label>
            <View className="flex-row items-center rounded-md px-4 h-14 mb-6" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
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

            <Button className="h-14" style={{ backgroundColor: '#FAB10A' }} onPress={onSubmit} disabled={loading}>
              {loading ? (
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator color="#000000" size="small" />
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>Enviando...</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-3">
                  <Send size={20} color="#000000" />
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>Enviar enlace</Text>
                </View>
              )}
            </Button>
          </View>
        </Card>
      </ScrollView>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revisa tu email</AlertDialogTitle>
            <AlertDialogDescription>
              Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setAlertOpen(false)}>
              <Text>Cerrar</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={() => { setAlertOpen(false); router.replace('/login'); }}>
              <Text>Ir a iniciar sesión</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}


