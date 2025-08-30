// hooks/useDownloadManager.ts
import { useState, useRef, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { Platform, Alert } from 'react-native';
import { FirestoreService } from '@/services/firestore.service';

interface DownloadState {
  isDownloading: boolean;
  progress: number;
  downloadId: string | null;
  error: string | null;
}

interface DownloadManager {
  downloadState: DownloadState;
  downloadWallpaper: (wallpaper: any, onSuccess?: () => void, onError?: (error: string) => void) => Promise<void>;
  cancelDownload: () => Promise<void>;
  clearError: () => void;
}

export const useDownloadManager = (): DownloadManager => {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    downloadId: null,
    error: null,
  });

  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setDownloadState(prev => ({ ...prev, error: null }));
  }, []);

  const resetDownloadState = useCallback(() => {
    setDownloadState({
      isDownloading: false,
      progress: 0,
      downloadId: null,
      error: null,
    });
  }, []);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'L\'accès au stockage est nécessaire pour télécharger les wallpapers.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } catch (error) {
        console.error('Permission check error:', error);
        return false;
      }
    }
    return true;
  }, []);

  const downloadWallpaper = useCallback(async (
    wallpaper: any,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    if (!wallpaper || downloadState.isDownloading) return;

    // Vérifier les permissions
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      onError?.('Permission de stockage refusée');
      return;
    }

    try {
      // Initialiser l'état de téléchargement
      setDownloadState({
        isDownloading: true,
        progress: 0,
        downloadId: wallpaper.id,
        error: null,
      });

      // Créer un contrôleur d'annulation
      abortController.current = new AbortController();

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileName = `wallpaper_${wallpaper.id}_${timestamp}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Créer le téléchargement resumable
      downloadRef.current = FileSystem.createDownloadResumable(
        wallpaper.optimizedUrl,
        fileUri,
        {
          headers: {
            'User-Agent': 'OWP-App/1.0',
          },
        },
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadState(prev => ({ ...prev, progress: Math.min(progress, 0.95) }));
        }
      );

      // Démarrer le téléchargement
      const downloadResult = await downloadRef.current.downloadAsync();

      // Vérifier si le téléchargement a été annulé
      if (abortController.current?.signal.aborted) {
        throw new Error('Téléchargement annulé');
      }

      if (!downloadResult?.uri) {
        throw new Error('Échec du téléchargement du fichier');
      }

      // Vérifier que le fichier existe et n'est pas corrompu
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 1000)) {
        throw new Error('Fichier téléchargé corrompu');
      }

      // Finaliser le progrès
      setDownloadState(prev => ({ ...prev, progress: 1 }));

      // Sauvegarder dans la galerie
      try {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        // Créer ou récupérer l'album OWP
        try {
          let album = await MediaLibrary.getAlbumAsync('OWP Wallpapers');
          if (!album) {
            album = await MediaLibrary.createAlbumAsync('OWP Wallpapers', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumError) {
          console.warn('Album creation/update failed:', albumError);
          // L'image est quand même sauvegardée dans la galerie principale
        }
      } catch (saveError) {
        console.error('Save to gallery error:', saveError);
        throw new Error('Impossible de sauvegarder dans la galerie');
      }

      // Nettoyer le fichier cache
      try {
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Cache cleanup failed:', cleanupError);
      }

      // Mettre à jour les statistiques dans Firestore (sans attendre)
      FirestoreService.incrementDownloadCount(wallpaper.id).catch(error => {
        console.warn('Failed to update download count:', error);
      });

      // Feedback haptique
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Callback de succès
      onSuccess?.();

      // Réinitialiser l'état
      resetDownloadState();

    } catch (error) {
      console.error('Download error:', error);
      
      let errorMessage = 'Erreur inconnue lors du téléchargement';
      
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
        } else if (error.message.includes('space') || error.message.includes('Storage')) {
          errorMessage = 'Espace de stockage insuffisant';
        } else if (error.message.includes('Permission')) {
          errorMessage = 'Permission de stockage requise';
        } else {
          errorMessage = error.message;
        }
      }

      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        error: errorMessage,
      }));

      onError?.(errorMessage);
    } finally {
      // Nettoyer les références
      downloadRef.current = null;
      abortController.current = null;
    }
  }, [downloadState.isDownloading, checkPermissions, resetDownloadState]);

  const cancelDownload = useCallback(async () => {
    if (!downloadState.isDownloading) return;

    try {
      // Annuler via AbortController
      if (abortController.current) {
        abortController.current.abort();
      }

      // Annuler le téléchargement Expo
      if (downloadRef.current) {
        await downloadRef.current.pauseAsync();
        downloadRef.current = null;
      }

      // Feedback haptique
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Réinitialiser l'état
      resetDownloadState();

    } catch (error) {
      console.error('Cancel download error:', error);
      resetDownloadState();
    }
  }, [downloadState.isDownloading, resetDownloadState]);

  return {
    downloadState,
    downloadWallpaper,
    cancelDownload,
    clearError,
  };
};