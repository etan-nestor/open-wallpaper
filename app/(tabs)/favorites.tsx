import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from '@/components/AnimatedBackground';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firestore.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loader from '@/components/Loader';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        // 1. Get favorites IDs from AsyncStorage
        const storedFavorites = await AsyncStorage.getItem('favorites');
        const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];
        
        // 2. Fetch each favorite wallpaper
        const favoritesData = await Promise.all(
          favoriteIds.map((id: string) => FirestoreService.getWallpaperById(id))
        );
        
        setFavorites(favoritesData.filter(Boolean));
      } catch (error) {
        console.error("Error loading favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const removeFavorite = async (wallpaperId: string) => {
    try {
      // 1. Get current favorites
      const storedFavorites = await AsyncStorage.getItem('favorites');
      let favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      // 2. Remove the wallpaper ID
      favoriteIds = favoriteIds.filter((id: string) => id !== wallpaperId);
      
      // 3. Save back to AsyncStorage
      await AsyncStorage.setItem('favorites', JSON.stringify(favoriteIds));
      
      // 4. Update state
      setFavorites(favorites.filter(item => item.id !== wallpaperId));
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50)}>
      <View style={[styles.favoriteCard, { backgroundColor: theme.card }]}>
        <Link href={`/wallpapers/${item.id}`} asChild>
          <TouchableOpacity>
            <Image 
              source={{ uri: item.optimizedUrl || item.thumbnailUrl }} 
              style={styles.favoriteImage} 
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
          </TouchableOpacity>
        </Link>
        
        <View style={styles.favoriteInfo}>
          <View>
            <Text style={[styles.favoriteTitle, { color: 'white' }]}>😊</Text>
            <Text style={[styles.favoriteCategory, { color: 'rgba(255,255,255,0.8)' }]}>
              {item.category}
            </Text>
          </View>
        
          <TouchableOpacity 
            onPress={() => removeFavorite(item.id)}
            style={styles.removeButton}
          >
            <Ionicons name="heart" size={24} color="#FF6B9D" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <AnimatedBackground>
        <Loader />
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Animated.Text 
          entering={FadeIn.duration(500)}
          style={[styles.title, { color: theme.text }]}
        >
          Mes Favoris
        </Animated.Text>

        {favorites.length === 0 ? (
          <Animated.View 
            style={styles.emptyContainer}
            entering={FadeIn.delay(300)}
          >
            <Ionicons name="heart-dislike" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Aucun favoris pour le moment
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Ajoutez des wallpapers à vos favoris en cliquant sur l'icône cœur
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </AnimatedBackground>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  favoriteCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  favoriteImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
  },
  favoriteInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  favoriteCategory: {
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  removeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
});