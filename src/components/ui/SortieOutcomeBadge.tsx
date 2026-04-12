import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { MissionOutcome } from '../../types';
import {
  colors,
  radii,
  spacing,
  fontSizes,
  fontWeights,
} from '../../constants/theme';

const LABELS: Record<MissionOutcome, string> = {
  success: 'COMPLETED',
  partial_time: 'PARTIAL',
  incomplete: 'INCOMPLETE',
  aborted: 'ABORTED',
};

const BADGE_STYLES: Record<
  MissionOutcome,
  { wrap: ViewStyle; text: TextStyle }
> = {
  success: {
    wrap: {
      borderColor: colors.earthGreen,
      backgroundColor: colors.earthGreenLight,
    },
    text: { color: colors.earthGreen },
  },
  partial_time: {
    wrap: {
      borderColor: colors.orange,
      backgroundColor: colors.orangeLight,
    },
    text: { color: colors.orange },
  },
  incomplete: {
    wrap: {
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    text: { color: colors.textSecondary },
  },
  aborted: {
    wrap: {
      borderColor: colors.textTertiary,
      backgroundColor: colors.surfaceElevated,
    },
    text: { color: colors.textTertiary },
  },
};

type Props = {
  outcome: MissionOutcome;
};

export function SortieOutcomeBadge({ outcome }: Props) {
  const b = BADGE_STYLES[outcome];
  return (
    <View style={[styles.badge, b.wrap]}>
      <Text style={[styles.badgeText, b.text]}>{LABELS[outcome]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 1,
  } as TextStyle,
});
