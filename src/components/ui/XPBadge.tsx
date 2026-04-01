import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing, fontSizes, fontWeights } from '../../constants/theme';

interface XPBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  /** When set (e.g. mission accent), badge matches that color instead of default XP purple. */
  accentColor?: string;
}

export function XPBadge({ xp, size = 'md', style, accentColor }: XPBadgeProps) {
  const accentText = accentColor ?? colors.purple;
  return (
    <View
      style={[
        styles.badge,
        styles[size],
        accentColor != null ? { backgroundColor: `${accentColor}22` } : null,
        style,
      ]}
    >
      <Text style={[styles.text, styles[`text_${size}`], { color: accentText }]}>
        +{xp} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.purpleLight,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  text: {
    color: colors.purple,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  text_sm: { fontSize: fontSizes.xs } as TextStyle,
  text_md: { fontSize: fontSizes.sm } as TextStyle,
  text_lg: { fontSize: fontSizes.md } as TextStyle,
});
