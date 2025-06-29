import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitleVisible: false,
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
    </Stack>
  );
}
