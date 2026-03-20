import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radii, spacing, fontSizes, fontWeights } from '../../constants/theme';

interface StreakBadgeProps {
  streak: number;
  isAlive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  showLabel?: boolean;
}

export function StreakBadge({
  streak,
  isAlive = true,
  size = 'md',
  style,
  showLabel = false,
}: StreakBadgeProps) {
  const dimmed = !isAlive && streak > 0;

  return (
    <View style={[styles.badge, styles[size], dimmed && styles.dimmed, style]}>
      <MaterialIcons name="local-fire-department" size={size === 'lg' ? 18 : size === 'md' ? 15 : 13} color={colors.orange} />
      <Text style={[styles.count, styles[`count_${size}`]]}>{streak}</Text>
      {showLabel && <Text style={[styles.label, styles[`count_${size}`]]}> day streak</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orangeLight,
    borderRadius: radii.full,
  } as ViewStyle,
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  } as ViewStyle,
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 3,
  } as ViewStyle,
  lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  } as ViewStyle,
  dimmed: {
    opacity: 0.5,
    backgroundColor: colors.border,
  } as ViewStyle,
  count: {
    color: colors.orange,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  label: {
    color: colors.orange,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  count_sm: { fontSize: fontSizes.xs } as TextStyle,
  count_md: { fontSize: fontSizes.sm } as TextStyle,
  count_lg: { fontSize: fontSizes.md } as TextStyle,
});
