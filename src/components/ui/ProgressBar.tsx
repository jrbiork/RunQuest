import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radii } from '../../constants/theme';

interface ProgressBarProps {
  progress: number;       // 0–1
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = colors.primary,
  backgroundColor = colors.border,
  height = 10,
  animated = true,
  style,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    if (animated) {
      width.value = withTiming(clamped * 100, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      width.value = clamped * 100;
    }
  }, [progress, animated, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor, height, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height, borderRadius: height / 2 },
          barStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  } as ViewStyle,
});
