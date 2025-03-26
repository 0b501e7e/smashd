import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { isLoggedIn, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText style={styles.message}>
          Please log in to view your profile and order history
        </ThemedText>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <ThemedText style={styles.buttonText}>Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E8E8E8', dark: '#2D2D2D' }}
      headerImage={
        <ThemedView style={[styles.headerContainer, { marginTop: insets.top }]}>
          <IconSymbol
            size={80}
            color="#808080"
            name="person.circle"
            style={styles.headerImage}
          />
        </ThemedView>
      }>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Account Details</ThemedText>
          {/* Add user details here once we have them from the backend */}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Loyalty Points</ThemedText>
          <ThemedText>You have 0 points</ThemedText>
        </ThemedView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.buttonText}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerImage: {
    alignSelf: 'center',
    marginTop: 60,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerContainer: {
    alignItems: 'center',
  },
});
