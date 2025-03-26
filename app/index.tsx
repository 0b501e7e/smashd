import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={[styles.title, { padding: 20, lineHeight: 48, height: 100 }]}>SMASH'D</ThemedText>
      <ThemedText style={styles.subtitle}>
        the best smash burgers in spain
      </ThemedText>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/(tabs)/menu')}>
        <ThemedText style={styles.buttonText}>VIEW MENU</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffaf1c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 24,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFE4B5',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
