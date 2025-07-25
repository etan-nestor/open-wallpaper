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
    updateDoc, increment,
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../firebaseConfig';
  import { Wallpaper, Category } from '../types';
  
  export const FirestoreService = {
    // Récupérer les wallpapers mis en avant
    async getFeaturedWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          where('isFeatured', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error getting featured wallpapers:", error);
        return [];
      }
    },
  
    // Récupérer toutes les catégories
    async getAllCategories(): Promise<Category[]> {
      try {
        const q = query(
          collection(db, 'OWP_categories'),
          orderBy('priority', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      } catch (error) {
        console.error("Error getting categories:", error);
        return [];
      }
    },
  
    // Récupérer une catégorie par son ID
    async getCategoryById(id: string): Promise<Category | null> {
      try {
        const docRef = doc(db, 'OWP_categories', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Category;
        }
        return null;
      } catch (error) {
        console.error("Error getting category:", error);
        return null;
      }
    },
  
    // Récupérer un wallpaper par son ID
    async getWallpaperById(id: string): Promise<Wallpaper | null> {
      try {
        const docRef = doc(db, 'OWP_wallpapers', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Wallpaper;
        }
        return null;
      } catch (error) {
        console.error("Error getting wallpaper:", error);
        return null;
      }
    },
  
    // Récupérer les wallpapers par catégorie
    async getWallpapersByCategory(categoryId: string, limitCount: number = 200): Promise<Wallpaper[]> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          where('categoryId', '==', categoryId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error getting wallpapers by category:", error);
        return [];
      }
    },
  
    // Récupérer les wallpapers similaires (même catégorie)
    async getRelatedWallpapers(categoryId: string, excludeId: string, limitCount: number = 25): Promise<Wallpaper[]> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          where('categoryId', '==', categoryId),
          where('id', '!=', excludeId),
          orderBy('downloads', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error getting related wallpapers:", error);
        return [];
      }
    },
  
    // Récupérer les wallpapers les plus populaires
    async getPopularWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          orderBy('downloads', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error getting popular wallpapers:", error);
        return [];
      }
    },
  
    // Récupérer les nouveaux wallpapers
    async getNewWallpapers(limitCount: number = 10): Promise<Wallpaper[]> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error getting new wallpapers:", error);
        return [];
      }
    },
  
    // Récupérer le nombre de wallpapers par catégorie
    async getWallpapersCountByCategory(categoryId: string): Promise<number> {
      try {
        const q = query(
          collection(db, 'OWP_wallpapers'),
          where('categoryId', '==', categoryId)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
      } catch (error) {
        console.error("Error getting wallpapers count:", error);
        return 0;
      }
    },
  
    // Recherche de wallpapers par terme
    async searchWallpapers(searchTerm: string, limitCount: number = 20): Promise<Wallpaper[]> {
      try {
        // Note: Firestore ne prend pas en charge la recherche textuelle native
        // Cette implémentation est basique et devrait être améliorée
        const q = query(
          collection(db, 'OWP_wallpapers'),
          where('title', '>=', searchTerm.toUpperCase()),
          where('title', '<=', searchTerm.toUpperCase() + '\uf8ff'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallpaper));
      } catch (error) {
        console.error("Error searching wallpapers:", error);
        return [];
      }
    },
  
    // Incrémenter le compteur de téléchargements
    async incrementDownloadCount(wallpaperId: string): Promise<void> {
      try {
        const docRef = doc(db, 'OWP_wallpapers', wallpaperId);
        await updateDoc(docRef, {
          downloads: increment(1),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error incrementing download count:", error);
      }
    },
  
    // Incrémenter le compteur de vues
    async incrementViewCount(wallpaperId: string): Promise<void> {
      try {
        const docRef = doc(db, 'OWP_wallpapers', wallpaperId);
        await updateDoc(docRef, {
          views: increment(1),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error incrementing view count:", error);
      }
    }
  };