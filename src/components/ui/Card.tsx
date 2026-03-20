import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
  /** Draw a 3px accent bar at the top of the card in the given color. */
  accentTop?: string;
}

export function Card({ children, style, elevated = false, noPadding = false, accentTop }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {accentTop && (
        <View style={[styles.accentBar, { backgroundColor: accentTop }]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.sm,
    overflow: 'hidden',
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  } as ViewStyle,
  noPadding: {
    padding: 0,
  } as ViewStyle,
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  } as ViewStyle,
});
