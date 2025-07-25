import { View, Text, Image, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '@/components/AnimatedBackground';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(height * 0.1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { theme } = useTheme();

  useEffect(() => {
    // Animation en séquence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/(tabs)/home');
  };

  const handleBrowseCategories = () => {
    router.push('/(tabs)/categories');
  };

  return (
    <AnimatedBackground>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Animated.View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/OWP_NB.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  backgroundColor: '#5168c4',
                  transform: [{
                    scale: scaleAnim.interpolate({
                      inputRange: [0.8, 1],
                      outputRange: [0.9, 1.1]
                    })
                  }]
                }
              ]}
            />
          </Animated.View>

          <Text style={[styles.title, { color: theme.text }]}>OWP</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Millions of HD wallpapers at your fingertips
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, {
                backgroundColor: '#ffd05b',
                shadowColor: '#ffd05b',
              }]}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: 'black' }]}>Get Started</Text>
              <MaterialIcons name="arrow-forward" size={20} color="black" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonOutline, {
                borderColor: '#9face1',
                backgroundColor: 'rgba(81, 104, 196, 0.1)'
              }]}
              onPress={handleBrowseCategories}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonOutlineText, { color: '#9face1' }]}>Browse Categories</Text>
              <MaterialIcons name="category" size={20} color="#9face1" />
            </TouchableOpacity>
          </View>
        </Animated.View>
        {/* Animation de particules */}
        <Animated.View style={[styles.particle, styles.particle1, {
          opacity: fadeAnim,
          backgroundColor: '#5168c4'
        }]} />
        <Animated.View style={[styles.particle, styles.particle2, {
          opacity: fadeAnim,
          backgroundColor: '#ffd05b'
        }]} />
        <Animated.View style={[styles.particle, styles.particle3, {
          opacity: fadeAnim,
          backgroundColor: '#9face1'
        }]} />
      </View>
    </AnimatedBackground>

  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
    width: 200,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    zIndex: 2,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(81, 104, 196, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
    marginRight: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  buttonOutline: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    fontWeight: '600',
    fontSize: 16,
    marginRight: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  // Particules décoratives
  particle: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.1,
  },
  particle1: {
    width: 200,
    height: 200,
    top: -50,
    left: -50,
  },
  particle2: {
    width: 150,
    height: 150,
    bottom: -30,
    right: -30,
  },
  particle3: {
    width: 100,
    height: 100,
    top: '30%',
    right: -30,
  },
});