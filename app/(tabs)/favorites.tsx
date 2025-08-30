import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from '@/components/AnimatedBackground';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FirestoreService } from '@/services/firestore.service';
import { FavoritesService } from '@/services/favorites.service';
import FallbackImage from '@/components/FallbackImage';
import Loader from '@/components/Loader';

interface FavoriteWallpaper {
  id: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  category: string;
  title?: string;
  downloads?: number;
}

export default React.memo(function FavoritesScreen() {
  const { theme } = useTheme();
  const [favorites, setFavorites] = useState<FavoriteWallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les favoris avec gestion d'erreur améliorée
  const loadFavorites = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const favoriteIds = await FavoritesService.getFavorites();
      
      if (favoriteIds.length === 0) {
        setFavorites([]);
        return;
      }

      // Charger les détails de chaque favori avec gestion des erreurs
      const favoritesPromises = favoriteIds.map(async (id) => {
        try {
          const wallpaper = await FirestoreService.getWallpaperById(id);
          return wallpaper;
        } catch (error) {
          console.warn(`Failed to load wallpaper ${id}:`, error);
          return null;
        }
      });

      const favoritesResults = await Promise.allSettled(favoritesPromises);
      
      // Filtrer les résultats valides
      const validFavorites = favoritesResults
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((wallpaper): wallpaper is FavoriteWallpaper => wallpaper !== null);

      // Nettoyer les favoris invalides
      const validIds = validFavorites.map(w => w.id);
      const invalidIds = favoriteIds.filter(id => !validIds.includes(id));
      
      if (invalidIds.length > 0) {
        console.log(`Cleaning ${invalidIds.length} invalid favorites`);
        for (const invalidId of invalidIds) {
          await FavoritesService.removeFavorite(invalidId);
        }
      }

      setFavorites(validFavorites);
    } catch (error) {
      console.error("Error loading favorites:", error);
      setError('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Charger au focus de l'écran
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  // Fonction de rafraîchissement
  const onRefresh = useCallback(() => {
    loadFavorites(true);
  }, [loadFavorites]);

  // Retirer un favori avec confirmation
  const removeFavorite = useCallback(async (wallpaper: FavoriteWallpaper) => {
    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${wallpaper.title || 'ce wallpaper'}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await FavoritesService.removeFavorite(wallpaper.id);
              
              // Mettre à jour l'état local pour une UX fluide
              setFavorites(prev => prev.filter(item => item.id !== wallpaper.id));
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error removing favorite:", error);
              Alert.alert('Erreur', 'Impossible de retirer ce favori');
            }
          }
        }
      ]
    );
  }, []);

  // Nettoyer tous les favoris
  const clearAllFavorites = useCallback(() => {
    if (favorites.length === 0) return;

    Alert.alert(
      'Vider les favoris',
      `Êtes-vous sûr de vouloir supprimer tous vos ${favorites.length} favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await FavoritesService.clearFavorites();
              setFavorites([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error clearing favorites:", error);
              Alert.alert('Erreur', 'Impossible de supprimer les favoris');
            }
          }
        }
      ]
    );
  }, [favorites.length]);

  // Rendu optimisé des éléments
  const renderItem = useCallback(({ item, index }: { item: FavoriteWallpaper; index: number }) => (
    <Animated.View 
      entering={FadeInRight.delay(index * 50)}
      exiting={FadeOutLeft.duration(300)}
      style={styles.favoriteCardContainer}
    >
      <View style={[styles.favoriteCard, { backgroundColor: theme.card }]}>
        <Link href={`/wallpapers/${item.id}`} asChild>
          <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9}>
            <FallbackImage
              sourceUri={item.thumbnailUrl || item.optimizedUrl} 
              style={styles.favoriteImage} 
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
            
            {/* Badge de téléchargements */}
            {item.downloads && item.downloads > 0 && (
              <View style={styles.downloadsBadge}>
                <Ionicons name="download-outline" size={12} color="white" />
                <Text style={styles.downloadsText}>
                  {item.downloads > 1000 
                    ? `${Math.floor(item.downloads / 1000)}k` 
                    : item.downloads
                  }
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>
        
        <View style={styles.favoriteInfo}>
          <View style={styles.textInfo}>
            <Text style={[styles.favoriteTitle, { color: 'white' }]} numberOfLines={1}>
              {item.title || '❤️'}
            </Text>
            <Text style={[styles.favoriteCategory, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
        
          <TouchableOpacity 
            onPress={() => removeFavorite(item)}
            style={styles.removeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={24} color="#FF6B9D" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  ), [theme, removeFavorite]);

  // Mémoriser les données pour éviter les re-renders
  const memoizedFavorites = useMemo(() => favorites, [favorites]);

  // État de chargement
  if (loading && !refreshing) {
    return (
      <AnimatedBackground>
        <Loader />
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* En-tête avec actions */}
        <View style={styles.header}>
          <Animated.Text 
            entering={FadeIn.duration(500)}
            style={[styles.title, { color: theme.text }]}
          >
            Mes Favoris
          </Animated.Text>
          
          {favorites.length > 0 && (
            <View style={styles.headerActions}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {favorites.length} wallpaper{favorites.length > 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                onPress={clearAllFavorites}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B9D" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error ? (
          <Animated.View style={styles.errorContainer} entering={FadeIn.delay(300)}>
            <Ionicons name="alert-circle" size={48} color="#FF6B9D" />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadFavorites()}
              style={[styles.retryButton, { backgroundColor: '#FF6B9D' }]}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : favorites.length === 0 ? (
          <Animated.View 
            style={styles.emptyContainer}
            entering={FadeIn.delay(300)}
          >
            <Ionicons name="heart-dislike" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Aucun favori pour le moment
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Ajoutez des wallpapers à vos favoris en cliquant sur l&apos;icône cœur
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={memoizedFavorites}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 232, // hauteur estimée de chaque item
              offset: 232 * index,
              index,
            })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF6B9D']}
                tintColor='#FF6B9D'
                title="Actualisation..."
                titleColor={theme.text}
              />
            }
          />
        )}
      </View>
    </AnimatedBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
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
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  favoriteCardContainer: {
    marginBottom: 16,
  },
  favoriteCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  favoriteImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
  },
  downloadsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
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
  textInfo: {
    flex: 1,
    marginRight: 12,
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
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});