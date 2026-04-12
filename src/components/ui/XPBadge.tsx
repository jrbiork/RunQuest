import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import {
  colors,
  radii,
  spacing,
  fontSizes,
  fontWeights,
} from '../../constants/theme';
import { darkenHex } from '../../utils/hexColor';

interface XPBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  /** When set (e.g. mission accent), badge matches that color instead of default XP purple. */
  accentColor?: string;
  /** High-contrast pill for colorful / gradient backgrounds (ignores accent for text). */
  variant?: 'default' | 'onVivid';
  /** Tighter padding and smaller type (e.g. home mission card corner). */
  compact?: boolean;
}

export function XPBadge({
  xp,
  size = 'md',
  style,
  accentColor,
  variant = 'default',
  compact = false,
}: XPBadgeProps) {
  const onVivid = variant === 'onVivid';
  const accentText = onVivid
    ? '#FFFFFF'
    : accentColor != null
      ? darkenHex(accentColor, 0.62)
      : colors.purple;
  return (
    <View
      style={[
        styles.badge,
        styles[size],
        compact && styles.compact,
        onVivid
          ? styles.badgeOnVivid
          : accentColor != null
            ? {
                backgroundColor: `${accentColor}2A`,
                borderWidth: 1,
                borderColor: `${accentColor}44`,
              }
            : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          compact && styles.textCompact,
          { color: accentText },
        ]}
      >
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
  badgeOnVivid: {
    backgroundColor: 'rgba(14, 18, 16, 0.55)',
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
  compact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minHeight: 22,
    justifyContent: 'center',
  } as ViewStyle,
  text: {
    color: colors.purple,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  text_sm: { fontSize: fontSizes.xs } as TextStyle,
  textCompact: {
    fontSize: 10,
    lineHeight: 14,
  } as TextStyle,
  text_md: { fontSize: fontSizes.sm } as TextStyle,
  text_lg: { fontSize: fontSizes.md } as TextStyle,
});
