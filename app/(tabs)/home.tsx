import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Linking } from 'react-native';
import { Link } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import Carousel from 'react-native-reanimated-carousel';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedBackground from '@/components/AnimatedBackground';
import { FirestoreService } from '@/services/firestore.service';
import FallbackImage from '@/components/FallbackImage';
import Loader from '@/components/Loader';
import { Category, Wallpaper } from '@/types';

const { width, height } = Dimensions.get('window');
const CAROUSEL_HEIGHT = height * 0.35;

export default React.memo(function HomeScreen() {
  const { theme } = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);
  const [featuredWallpapers, setFeaturedWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data with error handling
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [featured, cats] = await Promise.all([
        FirestoreService.getFeaturedWallpapers(4),
        FirestoreService.getAllCategories()
      ]);

      const categoriesWithCount = await Promise.all(
        cats.map(async (cat) => ({
          ...cat,
          count: await FirestoreService.getWallpapersCountByCategory(cat.id)
        }))
      );

      setFeaturedWallpapers(featured);
      setCategories(categoriesWithCount);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized carousel render item
  const renderCarouselItem = useCallback(({ item, index }: { item: Wallpaper; index: number }) => (
    <Animated.View entering={FadeIn.delay(index * 100)}>
      <Link href={`/wallpapers/${item.id}`} asChild>
        <TouchableOpacity style={styles.featuredItem}>
          <FallbackImage
            sourceUri={item.thumbnailUrl || item.optimizedUrl}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.featuredGradient}
          />
          <View style={styles.featuredTextContainer}>
            <Text
              style={styles.featuredTitle}
              onPress={() => Linking.openURL('https://opennumeric.com')}
            >
              opennumeric.com
            </Text>
          </View>
        </TouchableOpacity>
      </Link>
    </Animated.View>
  ), []);

  // Memoized category items
  const renderedCategories = useMemo(() =>
    categories.map((item, index) => (
      <Animated.View
        key={item.id}
        entering={FadeInDown.delay(300 + index * 50).duration(500)}
        style={styles.categoryItemWrapper}
      >
        <Link href={`/categories/${item.id}`} asChild>
          <TouchableOpacity style={styles.categoryItem}>
            <FallbackImage
              sourceUri={item.coverImage || item.thumbnail}
              style={styles.categoryImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.categoryGradient}
            />
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryName} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={styles.categoryCount}>{item.count} wallpapers</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </Animated.View>
    )),
    [categories]
  );

  // Loading state
  if (loading) {
    return (
      <AnimatedBackground>
        <Loader />
      </AnimatedBackground>
    );
  }

  // Error state
  if (error) {
    return (
      <AnimatedBackground>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            onPress={fetchData}
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.container}>
          {/* Featured Section */}
          <View style={styles.featuredSection}>
            <Animated.Text
              entering={FadeInDown.duration(500)}
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              Featured Wallpapers
            </Animated.Text>

            {featuredWallpapers.length > 0 ? (
              <>
                <View style={styles.carouselContainer}>
                  <Carousel
                    loop
                    width={width}
                    height={CAROUSEL_HEIGHT}
                    autoPlay={true}
                    autoPlayInterval={5000}
                    data={featuredWallpapers}
                    scrollAnimationDuration={1000}
                    onSnapToItem={setActiveSlide}
                    renderItem={renderCarouselItem}
                  />
                </View>

                <View style={styles.pagination}>
                  {featuredWallpapers.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        {
                          backgroundColor: index === activeSlide ? theme.accent : theme.textSecondary,
                        },
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No featured wallpapers available
              </Text>
            )}
          </View>

          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <Animated.Text
              entering={FadeInDown.delay(200).duration(500)}
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              Categories
            </Animated.Text>

            {categories.length > 0 ? (
              <View style={styles.categoriesGrid}>
                {renderedCategories}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No categories available
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 30,
  },
  featuredSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 20,
    marginBottom: 25,
    letterSpacing: 0.5,
  },
  carouselContainer: {
    marginBottom: 15,
  },
  featuredItem: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredTextContainer: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    right: 25,
  },
  featuredTitle: { 
    color: '#08C5D1',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  categoriesSection: {
    flex: 1,
    paddingHorizontal: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItemWrapper: {
    width: '48%',
    marginBottom: 15,
  },
  categoryItem: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryTextContainer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
  },
  categoryName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  categoryCount: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});