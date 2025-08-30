/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const BUBBLE_COUNT = 15;
const ICON_COUNT = 12;

const AnimatedBackground = ({ children }: { children: React.ReactNode }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  // Types de bulles glassmorphisme
  const bubbleTypes = [
    { size: 120, blur: 15, color: 'rgba(81, 104, 196, 0.2)' },
    { size: 80, blur: 10, color: 'rgba(159, 172, 225, 0.15)' },
    { size: 150, blur: 20, color: 'rgba(255, 208, 91, 0.1)' },
  ];

  // Icônes flottantes avec des noms valides
  const icons = [
    { name: 'image-outline', type: 'ionicons', size: 24, color: 'rgba(255,255,255,0.1)' },
    { name: 'color-palette-outline', type: 'ionicons', size: 28, color: 'rgba(255,255,255,0.15)' },
    { name: 'filter', type: 'material', size: 30, color: 'rgba(255,255,255,0.12)' },
    { name: 'brush', type: 'material', size: 26, color: 'rgba(255,255,255,0.1)' },
    { name: 'camera-outline', type: 'ionicons', size: 22, color: 'rgba(255,255,255,0.08)' },
    { name: 'layers-outline', type: 'ionicons', size: 25, color: 'rgba(255,255,255,0.12)' },
  ];

  // Positions initiales aléatoires
  const getRandomPosition = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    scale: 0.7 + Math.random() * 0.6,
    speed: 0.5 + Math.random() * 1.5,
    offset: Math.random() * Math.PI * 2,
  });

  const bubblePositions = Array.from({ length: BUBBLE_COUNT }).map(getRandomPosition);
  const iconPositions = Array.from({ length: ICON_COUNT }).map(getRandomPosition);

  return (
    <View style={styles.container}>
      {/* Fond dégradé bleu sombre */}
      <LinearGradient
        colors={['#0a0e21', '#1a1f38', '#252a4a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      {/* Bulles glassmorphisme animées */}
      {bubblePositions.map((pos, i) => {
        const bubbleType = bubbleTypes[i % bubbleTypes.length];
        
        const animatedStyle = useAnimatedStyle(() => {
          const moveX = Math.sin(progress.value * Math.PI * 2 * pos.speed + pos.offset) * width * 0.2;
          const moveY = Math.cos(progress.value * Math.PI * 2 * pos.speed * 0.7 + pos.offset) * height * 0.2;
          const scale = interpolate(
            Math.sin(progress.value * Math.PI * 2 * pos.speed + i),
            [-1, 1],
            [pos.scale * 0.9, pos.scale * 1.1],
            Extrapolate.CLAMP
          );
          
          return {
            transform: [
              { translateX: pos.x + moveX },
              { translateY: pos.y + moveY },
              { scale },
            ],
            opacity: interpolate(
              Math.sin(progress.value * Math.PI * 2 * pos.speed + i),
              [-1, 1],
              [0.5, 0.9],
              Extrapolate.CLAMP
            ),
          };
        });

        return (
          <Animated.View
            key={`bubble-${i}`}
            style={[
              styles.bubble,
              {
                width: bubbleType.size,
                height: bubbleType.size,
                backgroundColor: bubbleType.color,
                borderRadius: bubbleType.size / 2,
                backdropFilter: `blur(${bubbleType.blur}px)`,
              },
              animatedStyle,
            ]}
          />
        );
      })}
      
      {/* Icônes flottantes */}
      {iconPositions.map((pos, i) => {
        const icon = icons[i % icons.length];
        
        const animatedStyle = useAnimatedStyle(() => {
          const moveX = Math.sin(progress.value * Math.PI * 2 * pos.speed * 0.8 + pos.offset) * width * 0.15;
          const moveY = Math.cos(progress.value * Math.PI * 2 * pos.speed + pos.offset) * height * 0.15;
          
          return {
            transform: [
              { translateX: pos.x + moveX },
              { translateY: pos.y + moveY },
              { rotate: `${progress.value * 360 * pos.speed}deg` },
              { scale: pos.scale },
            ],
            opacity: interpolate(
              Math.sin(progress.value * Math.PI * 4 * pos.speed + i),
              [-1, 1],
              [0.2, 0.8],
              Extrapolate.CLAMP
            ),
          };
        });

        return (
          <Animated.View key={`icon-${i}`} style={[styles.iconContainer, animatedStyle]}>
            {icon.type === 'ionicons' ? (
              <Ionicons name={icon.name as any} size={icon.size} color={icon.color} />
            ) : (
              <MaterialCommunityIcons name={icon.name as any} size={icon.size} color={icon.color} />
            )}
          </Animated.View>
        );
      })}
      
      {/* Contenu par-dessus */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    zIndex:-10
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
  bubble: {
    position: 'absolute',
    opacity: 0.7,
  },
  iconContainer: {
    position: 'absolute',
  },
});

export default AnimatedBackground;