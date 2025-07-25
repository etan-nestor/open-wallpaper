import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { Link, useLocalSearchParams, useNavigation } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOut, RotateInDownLeft } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from '@/components/AnimatedBackground';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firestore.service';
import FallbackImage from '@/components/FallbackImage';
import Loader from '@/components/Loader';

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemGap = 8;
const itemSize = (width - (numColumns + 1) * itemGap) / numColumns;
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [category, setCategory] = useState<any>(null);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoryData, wallpapersData] = await Promise.all([
          FirestoreService.getCategoryById(id as string),
          FirestoreService.getWallpapersByCategory(id as string, 200)
        ]);

        setCategory(categoryData);
        setWallpapers(wallpapersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 50)}
      style={styles.itemContainer}
    >
      <Link href={`/wallpapers/${item.id}`} asChild>
        <TouchableOpacity style={styles.item}>
          <FallbackImage
            sourceUri={item.thumbnailUrl || item.optimizedUrl}
            style={styles.image}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.imageOverlay}
          />
          <Ionicons
            name="heart"
            size={20}
            color="white"
            style={styles.heartIcon}
          />
        </TouchableOpacity>
      </Link>
    </Animated.View>
  );

  if (loading || !category) {
    return (
      <AnimatedBackground>
        <Loader />
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B9D" />
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.headerContainer}>
          <View style={styles.coverImageContainer}>
            <FallbackImage
              sourceUri={category.coverImage || category.thumbnail}
              style={styles.coverImage}
            />
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
          />
          <Animated.View
            entering={RotateInDownLeft.duration(1000).springify().delay(200)}
            exiting={FadeOut}
            style={styles.backButton}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons
                name="arrow-back"
                size={24}
                color="white"
                style={styles.backIcon}
              />
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.headerContent}>
            <Text style={[styles.categoryName, { color: 'white' }]}>{category.displayName || category.name}</Text>
            <Text style={[styles.categoryDescription, { color: 'rgba(255,255,255,0.8)' }]}>
              {wallpapers.length} wallpapers disponibles
            </Text>
          </View>
        </Animated.View>

        <FlatList
          data={wallpapers}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 5,
  },

  coverImageContainer: {
    marginTop: STATUSBAR_HEIGHT-45,
    paddingHorizontal: 4,
    paddingTop: 15,
    backgroundColor:'transparent'
  },
  coverImage: {
    width: width - 10,
    height: 250,
    // borderRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10
  },

  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
  },
  categoryName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },
  categoryDescription: {
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  list: {
    padding: itemGap,
    paddingBottom: 30,
  },
  columnWrapper: {
    gap: itemGap,
  },
  itemContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  item: {
    width: itemSize,
    height: itemSize * 1.5,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heartIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16
  },
  backButton: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 25,
    left: 25,
    zIndex: 10,
    backgroundColor: 'rgba(255,107,157,0.7)',
    borderRadius: 20,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backIcon: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  }
})