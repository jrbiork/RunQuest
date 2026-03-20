import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

const RUN_OPTIONS: { value: number; sub: string }[] = [
  { value: 2, sub: 'LIGHT' },
  { value: 3, sub: 'STANDARD' },
  { value: 4, sub: 'HEAVY' },
  { value: 5, sub: 'EXTREME' },
];
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
      title="Output"
      subtitle="Weekly Quota"
      onNext={handleNext}
      nextLabel="Set Weekly Quota"
    >
      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'runs' && styles.toggleBtnActive]}
          onPress={() => setMode('runs')}
        >
          <Text style={[styles.toggleLabel, mode === 'runs' && styles.toggleLabelActive]}>
            SORTIES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'distance' && styles.toggleBtnActive]}
          onPress={() => setMode('distance')}
        >
          <Text style={[styles.toggleLabel, mode === 'distance' && styles.toggleLabelActive]}>
            RANGE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sorties selector */}
      {mode === 'runs' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sorties per week</Text>
          <View style={styles.pillRow}>
            {RUN_OPTIONS.map(({ value, sub }) => {
              const active = selectedRuns === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedRuns(value)}
                >
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                    {value}
                  </Text>
                  <Text style={[styles.pillSub, active && styles.pillSubActive]}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Range selector */}
      {mode === 'distance' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target range per week</Text>
          <View style={styles.pillRow}>
            {DISTANCE_OPTIONS.map((km) => {
              const active = selectedDistance === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedDistance(km)}
                >
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                    {km}
                  </Text>
                  <Text style={[styles.pillSub, active && styles.pillSubActive]}>km</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Field note */}
      <View style={styles.tip}>
        <MaterialIcons name="info-outline" size={14} color={colors.orange} />
        <Text style={styles.tipText}>
          FIELD NOTE: Smaller quotas build lasting operational habits. Scale up once stable.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  } as ViewStyle,
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  } as ViewStyle,
  toggleBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.orange,
    ...shadows.sm,
  } as ViewStyle,
  toggleLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  toggleLabelActive: {
    color: colors.orange,
  } as TextStyle,
  section: {
    gap: spacing.lg,
  } as ViewStyle,
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  pillRow: {
    flexDirection: 'row',
    gap: spacing.md,
  } as ViewStyle,
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.sm,
  } as ViewStyle,
  pillActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  } as ViewStyle,
  pillLabel: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  pillLabelActive: {
    color: colors.orange,
  } as TextStyle,
  pillSub: {
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  pillSubActive: {
    color: colors.orange,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.orangeLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orange,
    padding: spacing.md,
  } as ViewStyle,
  tipText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
});
