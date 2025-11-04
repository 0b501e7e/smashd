import React, { useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Lock, Check } from 'lucide-react-native';
import { authAPI } from '../../services/api';
import { useLocalSearchParams, router } from 'expo-router';
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

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const token = useMemo(() => String(params.token || ''), [params.token]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const onSubmit = async () => {
    setError('');
    if (!token) {
      setError('Enlace inválido o expirado.');
      return;
    }
    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccessOpen(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo restablecer la contraseña.');
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
              Restablecer contraseña
            </Text>
            <Text className="mb-6" style={{ color: '#CCCCCC' }}>
              Crea una nueva contraseña para tu cuenta.
            </Text>

            {error ? (
              <Card className="mb-4" style={{ borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.1)' }}>
                <View className="p-3">
                  <Text className="text-center" style={{ color: '#FF4444' }}>{error}</Text>
                </View>
              </Card>
            ) : null}

            <Label className="text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>Nueva contraseña</Label>
            <View className="flex-row items-center rounded-md px-4 h-14 mb-6" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
              <Lock size={18} color="#CCCCCC" />
              <Input
                placeholder="********"
                placeholderTextColor="#666666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="flex-1 ml-3 border-0 p-0 h-auto bg-transparent"
                style={{ color: '#FFFFFF' }}
              />
            </View>

            <Label className="text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>Confirmar contraseña</Label>
            <View className="flex-row items-center rounded-md px-4 h-14 mb-6" style={{ borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' }}>
              <Lock size={18} color="#CCCCCC" />
              <Input
                placeholder="********"
                placeholderTextColor="#666666"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                className="flex-1 ml-3 border-0 p-0 h-auto bg-transparent"
                style={{ color: '#FFFFFF' }}
              />
            </View>

            <Button className="h-14" style={{ backgroundColor: '#FAB10A' }} onPress={onSubmit} disabled={loading}>
              {loading ? (
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator color="#000000" size="small" />
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>Guardando...</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-3">
                  <Check size={20} color="#000000" />
                  <Text className="text-base font-semibold" style={{ color: '#000000' }}>Guardar contraseña</Text>
                </View>
              )}
            </Button>
          </View>
        </Card>
      </ScrollView>

      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contraseña actualizada</AlertDialogTitle>
            <AlertDialogDescription>
              Inicia sesión con tu nueva contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onPress={() => { setSuccessOpen(false); router.replace('/login'); }}>
              <Text>Ir a iniciar sesión</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}


