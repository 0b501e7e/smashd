import { Link } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className="flex-1 bg-black items-center justify-center px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
        <Text className="text-2xl font-bold text-white text-center">Esta pantalla no existe.</Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-base text-yellow-500 underline">¡Ir a la pantalla de inicio!</Text>
        </Link>
      </View>
    );
}
