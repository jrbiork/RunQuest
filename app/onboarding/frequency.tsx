import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { useOnboardingDraft } from './_layout';
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  radii,
} from '../../src/constants/theme';

const TICK_ROW_PAD = 11;

function clampDays(n: number): number {
  return Math.max(1, Math.min(7, Math.round(n)));
}

export default function OnboardingFrequencyScreen() {
  const draft = useOnboardingDraft();
  const [days, setDays] = useState(() =>
    clampDays(draft.current.trainingDaysPerWeek ?? 3),
  );

  const handleNext = () => {
    draft.current.trainingDaysPerWeek = days;
    router.push('/onboarding/distance' as any);
  };

  const onSliderChange = useCallback((raw: number) => {
    const clamped = clampDays(raw);
    setDays((prev) => {
      if (prev !== clamped) {
        Haptics.selectionAsync();
      }
      return clamped;
    });
  }, []);

  return (
    <OnboardingLayout
      step={2}
      totalSteps={5}
      title="How many days per week do you currently train?"
      subtitle="Training load"
      onNext={handleNext}
      nextLabel="Continue"
    >
      <View style={styles.card}>
        <View style={styles.valueBlock}>
          <Text style={styles.value}>{days}</Text>
          <Text style={styles.unit}>DAYS / WEEK</Text>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.edgeLabels}>
            <Text style={styles.edgeLabel}>1</Text>
            <Text style={styles.edgeLabel}>7</Text>
          </View>
          <Slider
            style={styles.slider}
            value={days}
            onValueChange={onSliderChange}
            minimumValue={1}
            maximumValue={7}
            step={1}
            minimumTrackTintColor={colors.orange}
            maximumTrackTintColor={colors.surfaceElevated}
            thumbTintColor={colors.orange}
            accessibilityLabel="Training days per week"
            accessibilityValue={{
              min: 1,
              max: 7,
              now: days,
              text: `${days} days per week`,
            }}
          />
          <View style={styles.tickLabels}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Text
                key={n}
                style={[styles.tickLabel, days === n && styles.tickLabelActive]}
              >
                {n}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.quickRow}>
          {[1, 3, 5, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.quickChip, days === n && styles.quickChipActive]}
              onPress={() => {
                setDays(n);
                Haptics.selectionAsync();
              }}
              accessibilityLabel={`Set to ${n} days`}
            >
              <Text
                style={[
                  styles.quickChipText,
                  days === n && styles.quickChipTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
  } as ViewStyle,
  valueBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  value: {
    fontSize: 52,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  unit: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 2,
  } as TextStyle,
  sliderBlock: {
    gap: spacing.sm,
  } as ViewStyle,
  edgeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  } as ViewStyle,
  edgeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  slider: {
    width: '100%',
    height: 44,
  } as ViewStyle,
  tickLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: TICK_ROW_PAD,
  } as ViewStyle,
  tickLabel: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    width: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  tickLabelActive: {
    color: colors.primary,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  quickChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  } as ViewStyle,
  quickChipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  } as TextStyle,
  quickChipTextActive: {
    color: colors.orange,
  } as TextStyle,
});
