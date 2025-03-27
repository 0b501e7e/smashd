import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import { SumUpWrapper } from '@/contexts/SumUpContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <CartProvider>
        <SumUpWrapper>
          <Stack 
            screenOptions={{
              headerShown: false,
            }}
          />
        </SumUpWrapper>
      </CartProvider>
    </ThemeProvider>
  );
} 