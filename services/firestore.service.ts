import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  getCountFromServer,
  doc,
  getDoc,
  updateDoc, 
  increment,
  serverTimestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Wallpaper, Category } from '../types';

// Cache global avec TTL
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = {
  categories: 10 * 60 * 1000, // 10 minutes
  wallpapers: 5 * 60 * 1000,  // 5 minutes
  featured: 3 * 60 * 1000,    // 3 minutes
};

// Utilitaire pour gérer le cache
const cacheUtils = {
  set(key: string, data: any, ttl: number) {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  },

  get(key: string): any | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  },

  invalidate(pattern: string) {
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    });
  }
};

// Utilitaire pour la gestion d'erreurs
const handleFirestoreError = (error: any, operation: string) => {
  console.error(`Firestore ${operation} error:`, error);
  
  // Log détaillé pour le développement
  if (__DEV__) {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      operation
    });
  }
  
  return null;
};

// Utilitaire pour la pagination
interface PaginationState {
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export const FirestoreService = {
  // Récupérer les wallpapers mis en avant avec cache
  async getFeaturedWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
    const cacheKey = `featured_wallpapers_${limitCount}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, 'OWP_wallpapers'),
        where('isFeatured', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Wallpaper));
      
      cacheUtils.set(cacheKey, data, CACHE_TTL.featured);
      return data;
    } catch (error) {
      handleFirestoreError(error, 'getFeaturedWallpapers');
      return [];
    }
  },

  // Récupérer toutes les catégories avec cache optimisé
  async getAllCategories(): Promise<Category[]> {
    const cacheKey = 'all_categories';
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, 'OWP_categories'),
        orderBy('priority', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Category));
      
      cacheUtils.set(cacheKey, data, CACHE_TTL.categories);
      return data;
    } catch (error) {
      handleFirestoreError(error, 'getAllCategories');
      return [];
    }
  },

  // Récupérer une catégorie par son ID avec cache
  async getCategoryById(id: string): Promise<Category | null> {
    const cacheKey = `category_${id}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const docRef = doc(db, 'OWP_categories', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Category;
        cacheUtils.set(cacheKey, data, CACHE_TTL.categories);
        return data;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, 'getCategoryById');
    }
  },

  // Récupérer un wallpaper par son ID avec cache
  async getWallpaperById(id: string): Promise<Wallpaper | null> {
    const cacheKey = `wallpaper_${id}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const docRef = doc(db, 'OWP_wallpapers', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Wallpaper;
        cacheUtils.set(cacheKey, data, CACHE_TTL.wallpapers);
        return data;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, 'getWallpaperById');
    }
  },

  // Récupérer les wallpapers par catégorie avec pagination
  async getWallpapersByCategory(
    categoryId: string, 
    limitCount: number = 200,
    paginationState?: PaginationState
  ): Promise<{wallpapers: Wallpaper[], pagination: PaginationState}> {
    try {
      let q = query(
        collection(db, 'OWP_wallpapers'),
        where('categoryId', '==', categoryId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (paginationState?.lastDoc) {
        q = query(q, startAfter(paginationState.lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const wallpapers = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Wallpaper));

      const newPaginationState: PaginationState = {
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limitCount
      };

      return { wallpapers, pagination: newPaginationState };
    } catch (error) {
      handleFirestoreError(error, 'getWallpapersByCategory');
      return { 
        wallpapers: [], 
        pagination: { lastDoc: null, hasMore: false } 
      };
    }
  },

  // Récupérer les wallpapers similaires optimisé
  async getRelatedWallpapers(
    categoryId: string, 
    excludeId: string, 
    limitCount: number = 25
  ): Promise<Wallpaper[]> {
    const cacheKey = `related_${categoryId}_${excludeId}_${limitCount}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      // Requête optimisée sans le filtre "!=" qui est coûteux
      const q = query(
        collection(db, 'OWP_wallpapers'),
        where('categoryId', '==', categoryId),
        orderBy('downloads', 'desc'),
        limit(limitCount + 1) // +1 pour exclure ensuite
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper))
        .filter(wallpaper => wallpaper.id !== excludeId)
        .slice(0, limitCount);
      
      cacheUtils.set(cacheKey, data, CACHE_TTL.wallpapers);
      return data;
    } catch (error) {
      handleFirestoreError(error, 'getRelatedWallpapers');
      return [];
    }
  },

  // Récupérer les wallpapers populaires avec cache
  async getPopularWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
    const cacheKey = `popular_wallpapers_${limitCount}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, 'OWP_wallpapers'),
        orderBy('downloads', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Wallpaper));
      
      cacheUtils.set(cacheKey, data, CACHE_TTL.wallpapers);
      return data;
    } catch (error) {
      handleFirestoreError(error, 'getPopularWallpapers');
      return [];
    }
  },

  // Récupérer les nouveaux wallpapers
  async getNewWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
    const cacheKey = `new_wallpapers_${limitCount}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, 'OWP_wallpapers'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Wallpaper));
      
      cacheUtils.set(cacheKey, data, CACHE_TTL.wallpapers);
      return data;
    } catch (error) {
      handleFirestoreError(error, 'getNewWallpapers');
      return [];
    }
  },

  // Compter les wallpapers par catégorie avec cache
  async getWallpapersCountByCategory(categoryId: string): Promise<number> {
    const cacheKey = `count_${categoryId}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached !== null) return cached;

    try {
      const q = query(
        collection(db, 'OWP_wallpapers'),
        where('categoryId', '==', categoryId)
      );
      const snapshot = await getCountFromServer(q);
      const count = snapshot.data().count;
      
      cacheUtils.set(cacheKey, count, CACHE_TTL.wallpapers);
      return count;
    } catch (error) {
      handleFirestoreError(error, 'getWallpapersCountByCategory');
      return 0;
    }
  },

  // Recherche optimisée de wallpapers
  async searchWallpapers(searchTerm: string, limitCount: number = 20): Promise<Wallpaper[]> {
    if (!searchTerm.trim()) return [];

    const cacheKey = `search_${searchTerm.toLowerCase()}_${limitCount}`;
    const cached = cacheUtils.get(cacheKey);
    if (cached) return cached;

    try {
      const normalizedTerm = searchTerm.trim().toUpperCase();
      
      // Recherche par titre
      const titleQuery = query(
        collection(db, 'OWP_wallpapers'),
        where('title', '>=', normalizedTerm),
        where('title', '<=', normalizedTerm + '\uf8ff'),
        limit(limitCount)
      );

      // Recherche par tags si disponible
      const tagQuery = query(
        collection(db, 'OWP_wallpapers'),
        where('tags', 'array-contains-any', [normalizedTerm.toLowerCase()]),
        limit(limitCount)
      );

      const [titleSnapshot, tagSnapshot] = await Promise.allSettled([
        getDocs(titleQuery),
        getDocs(tagQuery)
      ]);

      const results = new Map<string, Wallpaper>();

      // Traiter les résultats par titre
      if (titleSnapshot.status === 'fulfilled') {
        titleSnapshot.value.docs.forEach(doc => {
          results.set(doc.id, { id: doc.id, ...doc.data() } as Wallpaper);
        });
      }

      // Traiter les résultats par tags
      if (tagSnapshot.status === 'fulfilled') {
        tagSnapshot.value.docs.forEach(doc => {
          results.set(doc.id, { id: doc.id, ...doc.data() } as Wallpaper);
        });
      }

      const data = Array.from(results.values()).slice(0, limitCount);
      cacheUtils.set(cacheKey, data, 2 * 60 * 1000); // Cache court pour les recherches
      
      return data;
    } catch (error) {
      handleFirestoreError(error, 'searchWallpapers');
      return [];
    }
  },

  // Incrémenter les compteurs de manière optimisée
  async incrementDownloadCount(wallpaperId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'OWP_wallpapers', wallpaperId);
      await updateDoc(docRef, {
        downloads: increment(1),
        updatedAt: serverTimestamp()
      });

      // Invalider le cache
      cacheUtils.invalidate(`wallpaper_${wallpaperId}`);
      
      return true;
    } catch (error) {
      handleFirestoreError(error, 'incrementDownloadCount');
      return false;
    }
  },

  async incrementViewCount(wallpaperId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'OWP_wallpapers', wallpaperId);
      await updateDoc(docRef, {
        views: increment(1),
        updatedAt: serverTimestamp()
      });

      // Invalider le cache
      cacheUtils.invalidate(`wallpaper_${wallpaperId}`);
      
      return true;
    } catch (error) {
      handleFirestoreError(error, 'incrementViewCount');
      return false;
    }
  },

  // Utilitaires de cache
  clearCache() {
    cache.clear();
  },

  invalidateCache(pattern?: string) {
    if (pattern) {
      cacheUtils.invalidate(pattern);
    } else {
      cache.clear();
    }
  },

  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
};