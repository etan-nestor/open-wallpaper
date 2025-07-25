import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';

interface OWPLetterProps {
  letter: string;
  index: number;
}

const OWPLetter: React.FC<OWPLetterProps> = ({ letter, index }) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const yOffset = useSharedValue(20);

  React.useEffect(() => {
    const delay = index * 150;

    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      true
    );

    rotate.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(10, { duration: 300 }),
        withTiming(-5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) })
    );

    yOffset.value = withDelay(
      delay,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotate.value}deg` },
        { translateY: yOffset.value }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.Text style={[styles.letter, animatedStyle]}>
      {letter}
    </Animated.Text>
  );
};

const RippleEffect: React.FC = () => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.exp) }),
      -1,
      false
    );

    scale.value = withRepeat(
      withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.exp) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0.6, 0]);

    return {
      opacity,
      transform: [{ scale: scale.value }],
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 2,
      borderColor: '#FF6B9D',
      position: 'absolute',
    };
  });

  return <Animated.View style={animatedStyle} />;
};

const Loader: React.FC = () => {
  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(500)}
    >
      <RippleEffect />
      <RippleEffect />
      <View style={styles.lettersContainer}>
        {['O', 'W', 'P'].map((letter, index) => (
          <OWPLetter key={index} letter={letter} index={index} />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    // backgroundColor: 'rgba(0,0,0,0.7)',
  },
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginHorizontal: 8,
    textShadowColor: 'rgba(255,107,157,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default Loader;