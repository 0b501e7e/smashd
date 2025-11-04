import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: '#fff',
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTitleStyle: {
          color: '#fff',
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: true, title: 'Iniciar Sesión' }} />
      <Stack.Screen name="register" options={{ headerShown: true, title: 'Crear Cuenta' }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Recuperar Contraseña' }} />
      <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'Restablecer Contraseña' }} />
    </Stack>
  );
}
