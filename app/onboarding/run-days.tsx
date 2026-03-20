import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day];
    });
  };

  const isValid = selectedDays.length >= targetRuns;

  const handleNext = () => {
    if (!isValid) return;
    const ordered = ALL_DAYS.map((d) => d.value).filter((d) => selectedDays.includes(d));
    draft.current.preferredDays = ordered;
    router.push('/onboarding/pace');
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={5}
      title="Deployment Schedule"
      subtitle="Active Operation Days"
      onNext={handleNext}
      nextLabel="Lock Schedule"
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
                {full.toUpperCase()}
              </Text>
              {isSelected ? (
                <View style={styles.checkSquare}>
                  <MaterialIcons name="check" size={12} color={colors.textInverse} />
                </View>
              ) : (
                <View style={styles.checkEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          <Text style={styles.counterBold}>{selectedDays.length}</Text>
          <Text style={styles.counterDim}> / {targetRuns} DAYS ACTIVE</Text>
        </Text>
        {selectedDays.length > targetRuns && (
          <Text style={styles.counterExtra}>
            +{selectedDays.length - targetRuns} extra — first {targetRuns} days will be prioritized
          </Text>
        )}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  } as ViewStyle,
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  dayCardActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  } as ViewStyle,
  dayShort: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    width: 36,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  dayShortActive: {
    color: colors.orange,
  } as TextStyle,
  dayFull: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  dayFullActive: {
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
  checkSquare: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  checkEmpty: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  counter: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  } as ViewStyle,
  counterText: {
    fontSize: fontSizes.md,
  } as TextStyle,
  counterBold: {
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    fontSize: fontSizes.xl,
  } as TextStyle,
  counterDim: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: fontSizes.sm,
  } as TextStyle,
  counterExtra: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
});
