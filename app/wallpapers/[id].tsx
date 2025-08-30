/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect, useCallback, useRef } from "react";
import { FirestoreService } from "@/services/firestore.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedBackground from "@/components/AnimatedBackground";
import Loader from "@/components/Loader";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import WallpaperModal from "@/components/WallPaperModal";

const { width, height } = Dimensions.get("window");

// Cache pour éviter les rechargements
const wallpaperCache = new Map();
const relatedWallpapersCache = new Map();

// Hook personnalisé pour les favoris
const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("favorites");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading favorites:", error);
      return [];
    }
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      try {
        const currentFavorites = await loadFavorites();
        const isFavorite = currentFavorites.includes(id);

        let newFavorites;
        if (isFavorite) {
          newFavorites = currentFavorites.filter(
            (favId: string) => favId !== id
          );
        } else {
          newFavorites = [...currentFavorites, id];
        }

        await AsyncStorage.setItem("favorites", JSON.stringify(newFavorites));
        setFavorites(newFavorites);

        return !isFavorite;
      } catch (error) {
        console.error("Error toggling favorite:", error);
        throw error;
      }
    },
    [loadFavorites]
  );

  const checkIsFavorite = useCallback(
    async (id: string) => {
      const currentFavorites = await loadFavorites();
      return currentFavorites.includes(id);
    },
    [loadFavorites]
  );

  return { favorites, toggleFavorite, checkIsFavorite };
};

// Hook pour la gestion des téléchargements
const useDownloadManager = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);

  const downloadImage = useCallback(
    async (
      wallpaper: any,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ) => {
      if (!wallpaper || isDownloading) return;

      try {
        setIsDownloading(true);
        setDownloadProgress(0);

        // Vérifier les permissions sur Android
        if (Platform.OS === "android") {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== "granted") {
            onError?.("Permission de stockage requise pour télécharger");
            return;
          }
        }

        const fileUri = `${FileSystem.cacheDirectory}wallpaper_${
          wallpaper.id
        }_${Date.now()}.jpg`;

        // Créer un téléchargement resumable avec progression
        downloadRef.current = FileSystem.createDownloadResumable(
          wallpaper.optimizedUrl,
          fileUri,
          {},
          (downloadProgress) => {
            const progress =
              downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
          }
        );

        const downloadResult = await downloadRef.current.downloadAsync();

        if (!downloadResult?.uri) {
          throw new Error("Échec du téléchargement");
        }

        // Sauvegarder dans la galerie
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

        // Créer un album personnalisé
        try {
          await MediaLibrary.createAlbumAsync("OWP Wallpapers", asset, false);
        } catch (albumError) {
          // Si la création d'album échoue, l'image est quand même sauvegardée
          console.warn("Album creation failed, but image saved:", albumError);
        }

        // Incrémenter le compteur de téléchargements
        await FirestoreService.incrementDownloadCount(wallpaper.id);

        // Nettoyer le cache
        try {
          await FileSystem.deleteAsync(downloadResult.uri, {
            idempotent: true,
          });
        } catch (cleanupError) {
          console.warn("Cache cleanup failed:", cleanupError);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.();
      } catch (error) {
        console.error("Download error:", error);
        onError?.(
          error instanceof Error ? error.message : "Erreur de téléchargement"
        );
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
        downloadRef.current = null;
      }
    },
    [isDownloading]
  );

  const cancelDownload = useCallback(async () => {
    if (downloadRef.current && isDownloading) {
      try {
        await downloadRef.current.pauseAsync();
        downloadRef.current = null;
        setIsDownloading(false);
        setDownloadProgress(0);
      } catch (error) {
        console.error("Cancel download error:", error);
      }
    }
  }, [isDownloading]);

  return { isDownloading, downloadProgress, downloadImage, cancelDownload };
};

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams();
  useTheme();
  const [wallpaper, setWallpaper] = useState<any>(null);
  const [relatedWallpapers, setRelatedWallpapers] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMoreFrom, setShowMoreFrom] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [isSettingWallpaper, setIsSettingWallpaper] = useState(false);

  const { toggleFavorite, checkIsFavorite } = useFavorites();
  const { isDownloading, downloadProgress, downloadImage, cancelDownload } =
    useDownloadManager();

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Fonction optimisée pour charger les données avec cache
  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Vérifier le cache d'abord
      const cacheKey = `wallpaper_${id}`;
      let wallpaperData = wallpaperCache.get(cacheKey);

      if (!wallpaperData) {
        wallpaperData = await FirestoreService.getWallpaperById(id as string);
        if (wallpaperData) {
          wallpaperCache.set(cacheKey, wallpaperData);
        }
      }

      if (wallpaperData) {
        setWallpaper(wallpaperData);

        // Incrémenter les vues de manière asynchrone
        FirestoreService.incrementViewCount(wallpaperData.id).catch(
          console.error
        );

        // Charger les wallpapers liés avec cache
        const relatedCacheKey = `related_${wallpaperData.categoryId}_${id}`;
        let related = relatedWallpapersCache.get(relatedCacheKey);

        if (!related) {
          related = await FirestoreService.getRelatedWallpapers(
            wallpaperData.categoryId,
            id as string
          );
          relatedWallpapersCache.set(relatedCacheKey, related);
        }

        setRelatedWallpapers(related);

        // Vérifier le statut favori
        const favoriteStatus = await checkIsFavorite(id as string);
        setIsFavorite(favoriteStatus);
      }
    } catch (error) {
      console.error("Error loading wallpaper:", error);
      setMessage("Erreur lors du chargement du wallpaper");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  }, [id, checkIsFavorite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Geste de retour optimisé
  const panGesture = Gesture.Pan().onEnd((e) => {
    if (e.translationX > 50 && Math.abs(e.velocityX) > 100) {
      runOnJS(router.back)();
    }
  });

  // Gestion optimisée des favoris
  const handleToggleFavorite = useCallback(async () => {
    if (!id) return;

    try {
      const newFavoriteStatus = await toggleFavorite(id as string);
      setIsFavorite(newFavoriteStatus);

      setMessage(
        newFavoriteStatus ? "Ajouté aux favoris" : "Retiré des favoris"
      );
      setModalVisible(true);

      Haptics.notificationAsync(
        newFavoriteStatus
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setMessage("Erreur lors de la mise à jour des favoris");
      setModalVisible(true);
    }
  }, [id, toggleFavorite]);

  // Partage optimisé
  const onShare = useCallback(async () => {
    if (!wallpaper) return;

    try {
      // Essayer de partager l'image directement
      if (await Sharing.isAvailableAsync()) {
        const fileUri = `${FileSystem.cacheDirectory}share_${wallpaper.id}.jpg`;
        const { uri } = await FileSystem.downloadAsync(
          wallpaper.optimizedUrl,
          fileUri
        );

        await Sharing.shareAsync(uri, {
          mimeType: "image/jpeg",
          dialogTitle: "Partager ce wallpaper",
          UTI: "public.jpeg",
        });

        // Nettoyer le fichier temporaire
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(
          console.warn
        );
      } else {
        // Fallback vers le partage natif
        await Share.share({
          message: `Découvrez ce superbe wallpaper: ${wallpaper.title}`,
          url: wallpaper.optimizedUrl,
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      setMessage("Erreur lors du partage");
      setModalVisible(true);
    }
  }, [wallpaper]);

  // Gestion optimisée du wallpaper
  const handleSetWallpaper = useCallback(
    async (type: "home" | "lock" | "both") => {
      if (!wallpaper || isSettingWallpaper) return;

      try {
        setIsSettingWallpaper(true);
        setActionModalVisible(false);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (Platform.OS === "android") {
          // Android: Essayer d'ouvrir les paramètres système
          try {
            const intent = "android.intent.action.SET_WALLPAPER";
            const canOpen = await Linking.canOpenURL(
              `intent://#Intent;action=${intent};end`
            );

            if (canOpen) {
              await Linking.openURL(`intent://#Intent;action=${intent};end`);
            } else {
              // Fallback: télécharger et partager
              await downloadImage(
                wallpaper,
                () => {
                  setMessage(
                    "Image téléchargée. Définissez-la depuis votre galerie."
                  );
                  setModalVisible(true);
                },
                (error) => {
                  setMessage(error);
                  setModalVisible(true);
                }
              );
            }
          } catch (error) {
            // Dernière option: partage simple
            const fileUri = `${FileSystem.cacheDirectory}wallpaper_set_${wallpaper.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(
              wallpaper.optimizedUrl,
              fileUri
            );

            await Sharing.shareAsync(uri, {
              dialogTitle: "Définir comme fond d'écran",
              mimeType: "image/jpeg",
            });

            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(
              console.warn
            );
          }

          await FirestoreService.incrementDownloadCount(wallpaper.id);
        } else {
          // iOS: Guide l'utilisateur
          Alert.alert(
            "Définir le fond d'écran",
            "L'image va être téléchargée. Allez dans Photos > Sélectionnez l'image > Utiliser comme fond d'écran",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Télécharger",
                onPress: () =>
                  downloadImage(wallpaper, () => {
                    setMessage("Image téléchargée dans votre galerie");
                    setModalVisible(true);
                  }),
              },
            ]
          );
        }
      } catch (error) {
        console.error("Error setting wallpaper:", error);
        setMessage("Erreur lors de la définition du fond d'écran");
        setModalVisible(true);
      } finally {
        setIsSettingWallpaper(false);
      }
    },
    [wallpaper, isSettingWallpaper, downloadImage]
  );

  const showWallpaperOptions = useCallback(() => {
    setActionModalVisible(true);
  }, []);

  const toggleMoreFrom = useCallback(() => {
    setShowMoreFrom(!showMoreFrom);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [showMoreFrom]);

  const navigateToWallpaper = useCallback((wallpaperId: string) => {
    // Nettoyer le cache pour le nouveau wallpaper
    wallpaperCache.delete(`wallpaper_${wallpaperId}`);
    router.replace(`/wallpapers/${wallpaperId}`);
  }, []);

  const handleDownload = useCallback(() => {
    if (!wallpaper) return;

    downloadImage(
      wallpaper,
      () => {
        setMessage("Wallpaper téléchargé avec succès!");
        setModalVisible(true);
      },
      (error) => {
        setMessage(error);
        setModalVisible(true);
      }
    );
  }, [wallpaper, downloadImage]);

  if (loading || !wallpaper) {
    return (
      <AnimatedBackground>
        <Loader />
      </AnimatedBackground>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          bounces={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: wallpaper.optimizedUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </ScrollView>
      </GestureDetector>

      <Animated.View
        style={styles.header}
        entering={FadeIn.delay(300)}
        exiting={FadeOut}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowInfo(!showInfo)}
          style={styles.infoButton}
        >
          <Ionicons
            name={
              showInfo ? "information-circle" : "information-circle-outline"
            }
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </Animated.View>

      {showInfo && (
        <Animated.View
          style={styles.infoPanel}
          entering={FadeIn.delay(300)}
          exiting={FadeOut}
        >
          <Text style={styles.infoTitle}>{wallpaper.title}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{wallpaper.category}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Resolution:</Text>
            <Text style={styles.infoValue}>{wallpaper.resolution}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Size:</Text>
            <Text style={styles.infoValue}>{wallpaper.size}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Downloads:</Text>
            <Text style={styles.infoValue}>{wallpaper.downloads}</Text>
          </View>
        </Animated.View>
      )}

      <Animated.View
        style={styles.footer}
        entering={FadeIn.delay(300)}
        exiting={FadeOut}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.footerGradient}
        />

        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.actionButton}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#FF6B9D" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isDownloading ? cancelDownload : handleDownload}
            style={styles.actionButton}
            disabled={false}
          >
            {isDownloading ? (
              <View style={styles.downloadProgress}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.progressText}>
                  {Math.round(downloadProgress * 100)}%
                </Text>
              </View>
            ) : (
              <MaterialCommunityIcons name="download" size={28} color="white" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showWallpaperOptions}
            style={styles.actionButton}
            disabled={isSettingWallpaper}
          >
            {isSettingWallpaper ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <MaterialCommunityIcons
                name="wallpaper"
                size={28}
                color="white"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Feather name="share-2" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {relatedWallpapers.length > 0 && (
        <Animated.View
          style={styles.relatedContainer}
          entering={FadeIn.delay(500)}
          exiting={FadeOut}
        >
          <TouchableOpacity
            onPress={toggleMoreFrom}
            style={styles.moreFromHeader}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.moreFromIcon, animatedIconStyle]}>
              <Ionicons name="images" size={20} color="white" />
            </Animated.View>
            <Text style={styles.relatedTitle}>
              Plus de {wallpaper.category}
            </Text>
            <View style={styles.chevronContainer}>
              <Ionicons
                name={showMoreFrom ? "chevron-down" : "chevron-up"}
                size={20}
                color="white"
              />
            </View>
          </TouchableOpacity>

          {showMoreFrom && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedListContainer}
            >
              {relatedWallpapers.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.relatedItem}
                  onPress={() => navigateToWallpaper(item.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.relatedImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      <WallpaperModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        title="Définir comme fond d'écran"
        options={[
          {
            text: "Écran d'accueil",
            onPress: () => handleSetWallpaper("home"),
            icon: "home-outline",
          },
          {
            text: "Écran de verrouillage",
            onPress: () => handleSetWallpaper("lock"),
            icon: "lock-closed-outline",
          },
          {
            text: "Les deux",
            onPress: () => handleSetWallpaper("both"),
            icon: "phone-portrait-outline",
          },
        ]}
      />

      <WallpaperModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={message}
        options={[]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  imageContainer: {
    width: width,
    height: height,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 1,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoPanel: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    padding: 20,
    zIndex: 1,
  },
  infoTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    color: "rgba(255,255,255,0.7)",
    width: 100,
    fontSize: 14,
  },
  infoValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  footerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 1,
  },
  actionButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadProgress: {
    alignItems: "center",
  },
  progressText: {
    color: "white",
    fontSize: 10,
    marginTop: 2,
  },
  relatedContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 10,
  },
  moreFromHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  moreFromIcon: {
    backgroundColor: "#FF6B9D",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  relatedTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  chevronContainer: {
    backgroundColor: "#4CAF50",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  relatedListContainer: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  relatedItem: {
    width: 80,
    height: 120,
    borderRadius: 10,
    marginHorizontal: 5,
    overflow: "hidden",
  },
  relatedImage: {
    width: "100%",
    height: "100%",
  },
});
