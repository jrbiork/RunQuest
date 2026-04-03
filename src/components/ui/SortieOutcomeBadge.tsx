import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { MissionOutcome } from '../../types';
import { colors, radii, spacing, fontSizes, fontWeights } from '../../constants/theme';

const LABELS: Record<MissionOutcome, string> = {
  success: 'COMPLETED',
  failed_goal: 'FAILED',
  aborted: 'ABORTED',
};

const BADGE_STYLES: Record<
  MissionOutcome,
  { wrap: ViewStyle; text: TextStyle }
> = {
  success: {
    wrap: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    text: { color: colors.primary },
  },
  failed_goal: {
    wrap: {
      borderColor: colors.red,
      backgroundColor: colors.redLight,
    },
    text: { color: colors.red },
  },
  aborted: {
    wrap: {
      borderColor: colors.orange,
      backgroundColor: colors.orangeLight,
    },
    text: { color: colors.orange },
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
