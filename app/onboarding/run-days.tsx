import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { useOnboardingDraft } from './_layout';
import type { DayOfWeek } from '../../src/types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';

const ALL_DAYS: { value: DayOfWeek; full: string }[] = [
  { value: 'Mon', full: 'Monday' },
  { value: 'Tue', full: 'Tuesday' },
  { value: 'Wed', full: 'Wednesday' },
  { value: 'Thu', full: 'Thursday' },
  { value: 'Fri', full: 'Friday' },
  { value: 'Sat', full: 'Saturday' },
  { value: 'Sun', full: 'Sunday' },
];

export default function RunDaysScreen() {
  const draft = useOnboardingDraft();
  const targetRuns = draft.current.weeklyTargetRuns ?? 3;

  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(
    draft.current.preferredDays ?? [],
  );

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const isValid = selectedDays.length >= targetRuns;

  const handleNext = () => {
    if (!isValid) return;
    // Sort days in weekly order
    const ordered = ALL_DAYS.map((d) => d.value).filter((d) => selectedDays.includes(d));
    draft.current.preferredDays = ordered;
    router.push('/onboarding/pace');
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={5}
      title="Pick your run days"
      subtitle={`Select at least ${targetRuns} day${targetRuns > 1 ? 's' : ''}. These become your mission schedule.`}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <View style={styles.grid}>
        {ALL_DAYS.map(({ value, full }) => {
          const isSelected = selectedDays.includes(value);
          return (
            <TouchableOpacity
              key={value}
              style={[styles.dayCard, isSelected && styles.dayCardActive]}
              onPress={() => toggleDay(value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayShort, isSelected && styles.dayShortActive]}>
                {value}
              </Text>
              <Text style={[styles.dayFull, isSelected && styles.dayFullActive]}>
                {full}
              </Text>
              {isSelected && (
                <View style={styles.checkDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          <Text style={styles.counterBold}>{selectedDays.length}</Text>
          <Text style={styles.counterDim}> / {targetRuns} days selected</Text>
        </Text>
        {selectedDays.length > targetRuns && (
          <Text style={styles.counterExtra}>
            +{selectedDays.length - targetRuns} extra — we'll prioritize your first {targetRuns}
          </Text>
        )}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  } as ViewStyle,
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  dayCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  dayShort: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    width: 36,
  } as TextStyle,
  dayShortActive: {
    color: colors.primary,
  } as TextStyle,
  dayFull: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    flex: 1,
  } as TextStyle,
  dayFullActive: {
    color: colors.primaryDark,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  } as ViewStyle,
  counter: {
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  counterText: {
    fontSize: fontSizes.md,
  } as TextStyle,
  counterBold: {
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    fontSize: fontSizes.xl,
  } as TextStyle,
  counterDim: {
    color: colors.textSecondary,
  } as TextStyle,
  counterExtra: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
});
