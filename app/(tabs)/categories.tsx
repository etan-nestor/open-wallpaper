import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedBackground from '@/components/AnimatedBackground';
import { FirestoreService } from '@/services/firestore.service';
import Loader from '@/components/Loader';
import { Category } from '@/types';
import FallbackImage from '@/components/FallbackImage';

const { width } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = width * 0.6;
const PINK_THEME = '#FF6B9D';
const WHITE_TEXT = '#FFFFFF';

export default React.memo(function CategoriesScreen() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const cats = await FirestoreService.getAllCategories();
      const categoriesWithCount = await Promise.all(
        cats.map(async (cat) => ({
          ...cat,
          count: await FirestoreService.getWallpapersCountByCategory(cat.id)
        }))
      );
      setCategories(categoriesWithCount);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoized sorted categories
  const popularCategories = useMemo(() => 
    [...categories].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 3), 
    [categories]
  );

  const trendingCategories = useMemo(() => 
    [...categories].sort(() => 0.5 - Math.random()).slice(0, 3), 
    [categories]
  );

  // Render functions
  const renderVerticalItem = useCallback(({ item, index }: { item: Category; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50)}>
      <Link href={`/categories/${item.id}`} asChild>
        <TouchableOpacity style={[styles.categoryCard, { 
          backgroundColor: theme.card,
          shadowColor: theme.shadow,
          marginBottom: 16,
          borderRadius: 12,
        }]}>
          <FallbackImage 
            sourceUri={item.coverImage || item.thumbnail} 
            style={styles.categoryImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          
          <View style={styles.categoryContent}>
            <View style={[styles.iconContainer, { 
              backgroundColor: PINK_THEME + '20',
              borderColor: PINK_THEME,
              borderRadius: 14,
            }]}>
              <Ionicons name={item.icon as any} size={24} color={WHITE_TEXT} />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[styles.categoryName, { 
                color: WHITE_TEXT,
                fontWeight: '900',
                fontSize: 20,
              }]}>{item.displayName}</Text>
              <Text style={[styles.categoryCount, { 
                color: PINK_THEME,
                fontWeight: '700',
              }]}>
                {item.count} wallpapers
              </Text>
            </View>
            
            <Ionicons 
              name="chevron-forward-circle" 
              size={28} 
              color={WHITE_TEXT} 
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>
      </Link>
    </Animated.View>
  ), [theme]);

  const renderHorizontalItem = useCallback(({ item }: { item: Category }) => (
    <Animated.View entering={FadeInRight}>
      <Link href={`/categories/${item.id}`} asChild>
        <TouchableOpacity style={[styles.horizontalCard, { 
          backgroundColor: theme.card,
          shadowColor: theme.shadow,
          marginRight: 16,
          borderRadius: 10,
        }]}>
          <FallbackImage
            sourceUri={item.thumbnail || item.coverImage} 
            style={styles.horizontalImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          
          <View style={styles.horizontalContent}>
            <View style={[styles.iconContainer, { 
              backgroundColor: PINK_THEME + '20',
              borderColor: PINK_THEME,
              width: 40,
              height: 40,
              borderRadius: 14,
            }]}>
              <Ionicons name={item.icon as any} size={20} color={WHITE_TEXT} />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[styles.categoryName, { 
                color: WHITE_TEXT, 
                fontSize: 16,
                fontWeight: '900'
              }]}>{item.displayName}</Text>
              <Text style={[styles.categoryCount, { 
                color: PINK_THEME,
                fontSize: 12,
                fontWeight: '700'
              }]}>
                {item.count} wallpapers
              </Text>
            </View>
            
            <Ionicons 
              name="chevron-forward-circle" 
              size={24} 
              color={WHITE_TEXT} 
            />
          </View>
        </TouchableOpacity>
      </Link>
    </Animated.View>
  ), [theme]);

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
            onPress={fetchCategories}
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
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={styles.scrollContainer}
      >
        <Animated.Text
          entering={FadeInDown.duration(500)}
          style={[styles.title, { 
            color: WHITE_TEXT,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }]}
        >
          Catégories
        </Animated.Text>

        {/* Popular Categories */}
        <View style={[styles.sectionContainer, { marginTop: 8 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={22} color={PINK_THEME} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: WHITE_TEXT, fontWeight: '800' }]}>Populaires</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: PINK_THEME }]}>
            Les catégories les plus demandées
          </Text>
          <FlatList
            data={popularCategories}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Trending Categories */}
        <View style={[styles.sectionContainer, { marginTop: 32 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={22} color={PINK_THEME} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: WHITE_TEXT, fontWeight: '800' }]}>Tendances</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: PINK_THEME }]}>
            Catégories en vogue cette semaine
          </Text>
          <FlatList
            data={trendingCategories}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* All Categories */}
        <View style={[styles.sectionContainer, { marginTop: 32 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={22} color={PINK_THEME} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: WHITE_TEXT, fontWeight: '800' }]}>Toutes les catégories</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: PINK_THEME }]}>
            Explorez notre collection complète
          </Text>
          <View style={styles.verticalListContainer}>
            {categories.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderVerticalItem({ item, index })}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  verticalListContainer: {
    marginTop: 8,
  },
  horizontalList: {
    paddingBottom: 8,
  },
  categoryCard: {
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  horizontalCard: {
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: HORIZONTAL_CARD_WIDTH,
  },
  categoryImage: {
    width: '100%',
    height: 140,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  horizontalImage: {
    width: '100%',
    height: 100,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  horizontalContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    width: 48,
    height: 48,
  },
  textContainer: {
    flex: 1,
  },
  categoryName: {
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  categoryCount: {
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  chevron: {
    opacity: 0.9,
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