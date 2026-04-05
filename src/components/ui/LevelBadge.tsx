import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing, fontSizes, fontWeights } from '../../constants/theme';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  showLabel?: boolean;
  accentColor?: string;
}

export function LevelBadge({
  level,
  size = 'md',
  style,
  showLabel = false,
  accentColor = colors.primary,
}: LevelBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        styles[size],
        { backgroundColor: `${accentColor}22` },
        style,
      ]}
    >
      <Text style={[styles.levelNum, styles[`num_${size}`], { color: accentColor }]}>{level}</Text>
      {showLabel && (
        <Text style={[styles.levelLabel, styles[`num_${size}`], { color: accentColor }]}> RANK</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
  } as ViewStyle,
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 28,
    justifyContent: 'center',
  } as ViewStyle,
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 36,
    justifyContent: 'center',
  } as ViewStyle,
  lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 48,
    justifyContent: 'center',
  } as ViewStyle,
  levelNum: {
    fontWeight: fontWeights.extrabold,
    textAlign: 'center',
  } as TextStyle,
  levelLabel: {
    fontWeight: fontWeights.bold,
  } as TextStyle,
  num_sm: { fontSize: fontSizes.xs } as TextStyle,
  num_md: { fontSize: fontSizes.sm } as TextStyle,
  num_lg: { fontSize: fontSizes.md } as TextStyle,
});
