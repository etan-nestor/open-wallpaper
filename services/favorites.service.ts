// services/favorites.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const FAVORITES_KEY = 'owp_favorites';
const CACHE_KEY = 'owp_favorites_cache';

// Cache en mémoire pour éviter les lectures répétées
let favoritesCache: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const FavoritesService = {
  // Charger les favoris avec cache
  async getFavorites(): Promise<string[]> {
    const now = Date.now();
    
    // Vérifier le cache en mémoire
    if (favoritesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return [...favoritesCache];
    }

    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const favorites = stored ? JSON.parse(stored) : [];
      
      // Mettre à jour le cache
      favoritesCache = favorites;
      cacheTimestamp = now;
      
      return [...favorites];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  },

  // Vérifier si un wallpaper est en favori
  async isFavorite(wallpaperId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.includes(wallpaperId);
  },

  // Ajouter/retirer des favoris
  async toggleFavorite(wallpaperId: string): Promise<{ isFavorite: boolean; message: string }> {
    try {
      const favorites = await this.getFavorites();
      const currentlyFavorite = favorites.includes(wallpaperId);
      
      let newFavorites: string[];
      let message: string;

      if (currentlyFavorite) {
        newFavorites = favorites.filter(id => id !== wallpaperId);
        message = 'Retiré des favoris';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        newFavorites = [...favorites, wallpaperId];
        message = 'Ajouté aux favoris';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Sauvegarder
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      
      // Mettre à jour le cache
      favoritesCache = newFavorites;
      cacheTimestamp = Date.now();

      return {
        isFavorite: !currentlyFavorite,
        message
      };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Erreur lors de la mise à jour des favoris');
    }
  },

  // Ajouter un favori
  async addFavorite(wallpaperId: string): Promise<boolean> {
    const result = await this.toggleFavorite(wallpaperId);
    return result.isFavorite;
  },

  // Retirer un favori
  async removeFavorite(wallpaperId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    if (!favorites.includes(wallpaperId)) {
      return true; // Déjà retiré
    }
    
    const result = await this.toggleFavorite(wallpaperId);
    return !result.isFavorite;
  },

  // Compter les favoris
  async getFavoritesCount(): Promise<number> {
    const favorites = await this.getFavorites();
    return favorites.length;
  },

  // Nettoyer les favoris (supprimer tous)
  async clearFavorites(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      favoritesCache = [];
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error clearing favorites:', error);
      throw new Error('Erreur lors de la suppression des favoris');
    }
  },

  // Exporter les favoris
  async exportFavorites(): Promise<string[]> {
    return this.getFavorites();
  },

  // Importer des favoris
  async importFavorites(favoriteIds: string[]): Promise<void> {
    try {
      const validIds = favoriteIds.filter(id => typeof id === 'string' && id.length > 0);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(validIds));
      
      // Mettre à jour le cache
      favoritesCache = validIds;
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error importing favorites:', error);
      throw new Error('Erreur lors de l\'importation des favoris');
    }
  },

  // Invalider le cache (utile après des modifications externes)
  invalidateCache() {
    favoritesCache = null;
    cacheTimestamp = 0;
  }
};