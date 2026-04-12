import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../constants/theme';

interface OptionCardProps {
  label: string;
  description?: string;
  /** MaterialIcons icon name — replaces legacy emoji prop */
  icon?: string;
  /** Legacy emoji prop — ignored, use icon instead */
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function OptionCard({
  label,
  description,
  icon,
  selected,
  onPress,
  style,
}: OptionCardProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.97, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.card, selected && styles.selected, style]}
      >
        {/* Left: icon block + text */}
        <View style={styles.left}>
          {icon && (
            <View
              style={[styles.iconBlock, selected && styles.iconBlockSelected]}
            >
              <MaterialIcons
                name={icon as any}
                size={20}
                color={selected ? colors.textInverse : colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.textGroup}>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </Text>
            {description && (
              <Text
                style={[
                  styles.description,
                  selected && styles.descriptionSelected,
                ]}
              >
                {description}
              </Text>
            )}
          </View>
        </View>

        {/* Right: square checkmark badge */}
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected && (
            <MaterialIcons name="check" size={14} color={colors.textInverse} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    gap: spacing.md,
  } as ViewStyle,
  selected: {
    borderColor: colors.earthGreen,
    backgroundColor: colors.earthGreenLight,
  } as ViewStyle,

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  } as ViewStyle,

  // Icon block — stamped look
  iconBlock: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  iconBlockSelected: {
    backgroundColor: colors.earthGreen,
    borderColor: colors.earthGreen,
  } as ViewStyle,

  textGroup: {
    flex: 1,
    gap: 3,
  } as ViewStyle,
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  labelSelected: {
    color: colors.textPrimary,
  } as TextStyle,
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  } as TextStyle,
  descriptionSelected: {
    color: colors.textSecondary,
  } as TextStyle,

  // Square checkmark badge
  check: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  checkSelected: {
    backgroundColor: colors.earthGreen,
    borderColor: colors.earthGreen,
  } as ViewStyle,
});
