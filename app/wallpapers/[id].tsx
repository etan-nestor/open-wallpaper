import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Share, ScrollView, Platform, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback } from 'react';
import { FirestoreService } from '@/services/firestore.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedBackground from '@/components/AnimatedBackground';
import Loader from '@/components/Loader';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import WallpaperModal from '@/components/WallPaperModal';

const { width, height } = Dimensions.get('window');

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [wallpaper, setWallpaper] = useState<any>(null);
  const [relatedWallpapers, setRelatedWallpapers] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMoreFrom, setShowMoreFrom] = useState(true);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [isDownloading, setIsDownloading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isSettingWallpaper, setIsSettingWallpaper] = useState(false);

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
    };
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const wallpaperData = await FirestoreService.getWallpaperById(id as string);
      if (wallpaperData) {
        setWallpaper(wallpaperData);
        await FirestoreService.incrementViewCount(wallpaperData.id);

        const related = await FirestoreService.getRelatedWallpapers(
          wallpaperData.categoryId,
          id as string
        );
        setRelatedWallpapers(related);

        const favorites = await AsyncStorage.getItem('favorites');
        setIsFavorite(favorites ? JSON.parse(favorites).includes(id) : false);
      }
    } catch (error) {
      console.error("Error loading wallpaper:", error);
      setMessage('Failed to load wallpaper details');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationX > 50) {
        router.back();
      }
    });

  const toggleFavorite = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      let favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];

      if (isFavorite) {
        favoriteIds = favoriteIds.filter((favId: string) => favId !== id);
        setMessage('Removed from favorites');
      } else {
        favoriteIds = [...favoriteIds, id];
        setMessage('Added to favorites');
      }

      await AsyncStorage.setItem('favorites', JSON.stringify(favoriteIds));
      setIsFavorite(!isFavorite);
      setModalVisible(true);

      Haptics.notificationAsync(
        isFavorite
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setMessage('Failed to update favorites');
      setModalVisible(true);
    }
  };

  const onShare = async () => {
    try {
      if (!wallpaper) return;

      try {
        const fileUri = FileSystem.cacheDirectory + `wallpaper_${id}.jpg`;
        const { uri } = await FileSystem.downloadAsync(
          wallpaper.optimizedUrl,
          fileUri
        );

        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Wallpaper',
          UTI: 'public.jpeg',
        });
      } catch (error) {
        await Share.share({
          message: `Check out this amazing wallpaper: ${wallpaper.title}`,
          url: wallpaper.optimizedUrl,
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      setMessage('Failed to share wallpaper');
      setModalVisible(true);
    }
  };

  const downloadImage = async () => {
    if (!wallpaper) return;

    try {
      setIsDownloading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === 'android' && !permissionResponse?.granted) {
        const status = await requestPermission();
        if (!status.granted) {
          setMessage('Storage permission required to download');
          setModalVisible(true);
          return;
        }
      }

      const fileUri = FileSystem.cacheDirectory + `wallpaper_${id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(
        wallpaper.optimizedUrl,
        fileUri
      );

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('OWP Wallpapers', asset, false);

      await FirestoreService.incrementDownloadCount(wallpaper.id);
      setMessage('Wallpaper downloaded successfully!');
      setModalVisible(true);
    } catch (error) {
      console.error("Error downloading wallpaper:", error);
      setMessage('Failed to download wallpaper');
      setModalVisible(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSetWallpaper = async (type: 'home' | 'lock' | 'both') => {
    if (!wallpaper || isSettingWallpaper) return;

    try {
      setIsSettingWallpaper(true);
      setActionModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const fileUri = FileSystem.cacheDirectory + `wallpaper_set_${id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(
        wallpaper.optimizedUrl,
        fileUri
      );

      if (Platform.OS === 'ios') {
        // On iOS, guide user to set wallpaper manually
        setMessage('Download the image and set it from your Photos app');
        setModalVisible(true);
      } else {
        try {
          // Try to open the wallpaper picker directly
          await Linking.openURL(`content://com.android.wallpaperpicker`);
          await FirestoreService.incrementDownloadCount(wallpaper.id);
        } catch (error) {
          // Fallback to sharing the image
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Set as Wallpaper',
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
          });
          await FirestoreService.incrementDownloadCount(wallpaper.id);
        }
      }
    } catch (error) {
      console.error("Error setting wallpaper:", error);
      setMessage('Failed to set wallpaper');
      setModalVisible(true);
    } finally {
      setIsSettingWallpaper(false);
    }
  };

  const showWallpaperOptions = () => {
    setActionModalVisible(true);
  };

  const toggleMoreFrom = () => {
    setShowMoreFrom(!showMoreFrom);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const navigateToWallpaper = (wallpaperId: string) => {
    router.replace(`/wallpapers/${wallpaperId}`);
    loadData(); // Refresh data when navigating to new wallpaper
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowInfo(!showInfo)} style={styles.infoButton}>
          <Ionicons
            name={showInfo ? "information-circle" : "information-circle-outline"}
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
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.footerGradient}
        />

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.actionButton}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#FF6B9D" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={downloadImage}
            style={styles.actionButton}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="white" size="small" />
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
              <MaterialCommunityIcons name="wallpaper" size={28} color="white" />
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
            <Text style={styles.relatedTitle}>More from {wallpaper.category}</Text>
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
        title="Set as Wallpaper"
        options={[
          {
            text: 'Home Screen',
            onPress: () => handleSetWallpaper('home'),
            icon: 'home-outline'
          },
          {
            text: 'Lock Screen',
            onPress: () => handleSetWallpaper('lock'),
            icon: 'lock-closed-outline'
          },
          {
            text: 'Both',
            onPress: () => handleSetWallpaper('both'),
            icon: 'phone-portrait-outline'
          }
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
    backgroundColor: 'black',
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
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 20,
    zIndex: 1,
  },
  infoTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.7)',
    width: 100,
    fontSize: 14,
  },
  infoValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 1,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 10,
  },
  moreFromHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  moreFromIcon: {
    backgroundColor: '#FF6B9D',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  chevronContainer: {
    backgroundColor: '#4CAF50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  relatedImage: {
    width: '100%',
    height: '100%',
  },
});