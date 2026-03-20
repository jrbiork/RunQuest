import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, radii, fontSizes, fontWeights, shadows } from '../../constants/theme';

interface OptionCardProps {
  label: string;
  description?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function OptionCard({
  label,
  description,
  emoji,
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
        style={[
          styles.card,
          selected && styles.selected,
          style,
        ]}
      >
        <View style={styles.left}>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <View style={styles.textGroup}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
            {description && (
              <Text style={[styles.description, selected && styles.descriptionSelected]}>
                {description}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected && <MaterialIcons name="check" size={16} color="#fff" />}
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
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  } as ViewStyle,
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  } as ViewStyle,
  emoji: {
    fontSize: 26,
  } as TextStyle,
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  label: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  } as TextStyle,
  labelSelected: {
    color: colors.primaryDark,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,
  descriptionSelected: {
    color: colors.primaryDark,
  } as TextStyle,
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  } as ViewStyle,
});
