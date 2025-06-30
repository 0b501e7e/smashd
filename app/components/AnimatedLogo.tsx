import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const LOGO_SIZE = 150; // Adjust size as needed

export function AnimatedLogo() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1, // Loop indefinitely
      true // Reverse the animation on alternate loops
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View 
      className="justify-center items-center mb-10"
      style={[{ width: LOGO_SIZE, height: LOGO_SIZE }, animatedStyle]}
    >
      <Image
        source={require('@/assets/images/smashd.png')}
        className="w-full h-full"
        resizeMode="contain"
      />
    </Animated.View>
  );
}