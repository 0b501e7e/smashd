import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { menuAPI } from '@/services/api';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  description: string;
  category: 'BURGER' | 'SIDE' | 'DRINK';
  imageUrl: string;
};

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await menuAPI.getMenu();
      setMenuItems(data);
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
    });
  };

  const handleItemPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/item-customization',
      params: { itemId: item.id }
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }

  const categories = ['BURGER', 'SIDE', 'DRINK'] as const;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFE4B5', dark: '#8B4513' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <ThemedText style={[
            styles.headerText, 
            { 
              padding: 20,
              lineHeight: 48,
              height: 100
            }
          ]}>
            Our Menu
          </ThemedText>
        </ThemedView>
      }>
      <ThemedView style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        {categories.map(category => (
          <ThemedView key={category} style={styles.categorySection}>
            <ThemedText type="subtitle" style={styles.categoryTitle}>
              {category}s
            </ThemedText>
            {menuItems
              .filter(item => item.category === category)
              .map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => handleItemPress(item)}
                >
                  <ThemedView style={styles.itemInfo}>
                    <ThemedView style={styles.itemDetails}>
                      <ThemedText type="subtitle">{item.name}</ThemedText>
                      <ThemedText>${item.price.toFixed(2)}</ThemedText>
                      <ThemedText style={styles.description}>{item.description}</ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      handleAddToCart(item);
                    }}
                  >
                    <ThemedText style={styles.addButtonText}>Add to Cart</ThemedText>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
          </ThemedView>
        ))}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
  },
  headerContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  burgerCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  menuItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    flex: 1,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 