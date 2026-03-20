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

  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textInverse
      : variant === 'secondary'
      ? colors.orange
      : colors.primary;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : 20;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
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
          color={variant === 'primary' ? colors.textInverse : colors.orange}
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
    borderRadius: radii.md,
    ...shadows.sm,
  } as ViewStyle,
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconLeft: {
    marginRight: 8,
  } as TextStyle,

  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.orange,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
  danger: {
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: '#A33028',
  } as ViewStyle,

  // Sizes
  size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.sm } as ViewStyle,
  size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl } as ViewStyle,
  size_lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl } as ViewStyle,

  fullWidth: { width: '100%' } as ViewStyle,
  disabled: { opacity: 0.45 } as ViewStyle,

  // Label styles — all uppercase, stencil feel
  label: {
    fontWeight: fontWeights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  label_primary: { color: colors.textInverse } as TextStyle,
  label_secondary: { color: colors.orange } as TextStyle,
  label_ghost: { color: colors.textSecondary } as TextStyle,
  label_danger: { color: colors.textInverse } as TextStyle,

  labelSize_sm: { fontSize: fontSizes.xs } as TextStyle,
  labelSize_md: { fontSize: fontSizes.sm } as TextStyle,
  labelSize_lg: { fontSize: fontSizes.md } as TextStyle,
});
