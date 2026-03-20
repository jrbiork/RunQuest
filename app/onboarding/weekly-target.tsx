import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { useOnboardingDraft } from './_layout';
import type { WeeklyTargetMode } from '../../src/types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';

const RUN_OPTIONS = [2, 3, 4, 5];
const DISTANCE_OPTIONS = [10, 15, 20, 25, 30];

export default function WeeklyTargetScreen() {
  const draft = useOnboardingDraft();
  const [mode, setMode] = useState<WeeklyTargetMode>(
    draft.current.weeklyTargetMode ?? 'runs',
  );
  const [selectedRuns, setSelectedRuns] = useState<number>(
    draft.current.weeklyTargetRuns ?? 3,
  );
  const [selectedDistance, setSelectedDistance] = useState<number>(
    draft.current.weeklyTargetDistance ?? 15,
  );

  const handleNext = () => {
    draft.current.weeklyTargetMode = mode;
    draft.current.weeklyTargetRuns = selectedRuns;
    draft.current.weeklyTargetDistance = selectedDistance;
    router.push('/onboarding/run-days');
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={5}
      title="Set your weekly target"
      subtitle="You can always adjust this later. Start achievable."
      onNext={handleNext}
    >
      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'runs' && styles.toggleBtnActive]}
          onPress={() => setMode('runs')}
        >
          <Text style={[styles.toggleLabel, mode === 'runs' && styles.toggleLabelActive]}>
            Runs per week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'distance' && styles.toggleBtnActive]}
          onPress={() => setMode('distance')}
        >
          <Text style={[styles.toggleLabel, mode === 'distance' && styles.toggleLabelActive]}>
            Distance per week
          </Text>
        </TouchableOpacity>
      </View>

      {/* Runs selector */}
      {mode === 'runs' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How many runs per week?</Text>
          <View style={styles.pillRow}>
            {RUN_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.pill, selectedRuns === n && styles.pillActive]}
                onPress={() => setSelectedRuns(n)}
              >
                <Text style={[styles.pillLabel, selectedRuns === n && styles.pillLabelActive]}>
                  {n}
                </Text>
                <Text style={[styles.pillSub, selectedRuns === n && styles.pillSubActive]}>
                  {n === 2 ? 'Easy start' : n === 3 ? 'Recommended' : n === 4 ? 'Solid' : 'Committed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Distance selector */}
      {mode === 'distance' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target distance per week?</Text>
          <View style={styles.pillRow}>
            {DISTANCE_OPTIONS.map((km) => (
              <TouchableOpacity
                key={km}
                style={[styles.pill, selectedDistance === km && styles.pillActive]}
                onPress={() => setSelectedDistance(km)}
              >
                <Text style={[styles.pillLabel, selectedDistance === km && styles.pillLabelActive]}>
                  {km}
                </Text>
                <Text style={[styles.pillSub, selectedDistance === km && styles.pillSubActive]}>
                  km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tip */}
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 Starting smaller than you think builds lasting habits. You can always increase it.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.lg,
    padding: 4,
  } as ViewStyle,
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  } as ViewStyle,
  toggleBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  } as ViewStyle,
  toggleLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  } as TextStyle,
  toggleLabelActive: {
    color: colors.textPrimary,
  } as TextStyle,
  section: {
    gap: spacing.lg,
  } as ViewStyle,
  sectionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  } as TextStyle,
  pillRow: {
    flexDirection: 'row',
    gap: spacing.md,
  } as ViewStyle,
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.sm,
  } as ViewStyle,
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  pillLabel: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  pillLabelActive: {
    color: colors.primaryDark,
  } as TextStyle,
  pillSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
  pillSubActive: {
    color: colors.primaryDark,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
  tip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  } as ViewStyle,
  tipText: {
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    lineHeight: 20,
  } as TextStyle,
});
