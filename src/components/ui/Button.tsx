import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radii, fontSizes, fontWeights, shadows } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const iconColor = variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.primary;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : 20;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textInverse : colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <MaterialIcons name={icon as any} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    ...shadows.sm,
  } as ViewStyle,
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconLeft: {
    marginRight: 6,
  } as TextStyle,

  // Variants
  primary: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
  danger: {
    backgroundColor: colors.red,
  } as ViewStyle,

  // Sizes
  size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.md } as ViewStyle,
  size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl } as ViewStyle,
  size_lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl } as ViewStyle,

  fullWidth: { width: '100%' } as ViewStyle,
  disabled: { opacity: 0.5 } as ViewStyle,

  // Label styles
  label: {
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  } as TextStyle,
  label_primary: { color: colors.textInverse } as TextStyle,
  label_secondary: { color: colors.primary } as TextStyle,
  label_ghost: { color: colors.primary } as TextStyle,
  label_danger: { color: colors.textInverse } as TextStyle,

  labelSize_sm: { fontSize: fontSizes.sm } as TextStyle,
  labelSize_md: { fontSize: fontSizes.md } as TextStyle,
  labelSize_lg: { fontSize: fontSizes.lg } as TextStyle,
});
