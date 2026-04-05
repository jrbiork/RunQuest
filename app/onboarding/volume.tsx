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
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type {
  ActivityMode,
  CycleDistanceAnswer,
  RunDistanceAnswer,
} from '../../src/types';
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

const RUN_OPTS: {
  value: RunDistanceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'lt3', label: '< 3 km', description: 'Short sessions', icon: 'straighten' },
  { value: '3-5', label: '3 – 5 km', description: 'Typical easy distance', icon: 'straighten' },
  { value: '5-10', label: '5 – 10 km', description: 'Solid midweek run', icon: 'straighten' },
  { value: '10plus', label: '10+ km', description: 'Long or race-ready', icon: 'straighten' },
];

const CYCLE_OPTS: {
  value: CycleDistanceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'lt10', label: '< 10 km', description: 'Short spins', icon: 'route' },
  { value: '10-25', label: '10 – 25 km', description: 'Regular rides', icon: 'route' },
  { value: '25-60', label: '25 – 60 km', description: 'Endurance blocks', icon: 'route' },
  { value: '60plus', label: '60+ km', description: 'Long or event prep', icon: 'route' },
];

export default function OnboardingVolumeScreen() {
  const draft = useOnboardingDraft();
  const mode: ActivityMode = draft.current.defaultActivityMode ?? 'run';
  const [days, setDays] = useState(() =>
    clampDays(draft.current.trainingDaysPerWeek ?? 3),
  );
  const [runSel, setRunSel] = useState<RunDistanceAnswer | null>(
    draft.current.runDistance ?? null,
  );
  const [cycleSel, setCycleSel] = useState<CycleDistanceAnswer | null>(
    draft.current.cycleDistance ?? null,
  );

  const handleNext = () => {
    draft.current.trainingDaysPerWeek = days;
    if (mode === 'run') {
      if (!runSel) return;
      draft.current.runDistance = runSel;
      draft.current.cycleDistance = undefined;
    } else {
      if (!cycleSel) return;
      draft.current.cycleDistance = cycleSel;
      draft.current.runDistance = undefined;
    }
    router.push('/onboarding/goal' as any);
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

  const distOk = mode === 'run' ? runSel !== null : cycleSel !== null;

  return (
    <OnboardingLayout
      step={2}
      totalSteps={3}
      title="How often do you train, and what distance fits you?"
      subtitle="Volume"
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={!distOk}
    >
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DAYS PER WEEK</Text>
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

      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
        {mode === 'run' ? 'TYPICAL RUN DISTANCE' : 'TYPICAL RIDE DISTANCE'}
      </Text>
      <View style={styles.options}>
        {mode === 'run'
          ? RUN_OPTS.map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                selected={runSel === o.value}
                onPress={() => setRunSel(o.value)}
              />
            ))
          : CYCLE_OPTS.map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                selected={cycleSel === o.value}
                onPress={() => setCycleSel(o.value)}
              />
            ))}
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
    gap: spacing.md,
  } as ViewStyle,
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 2,
  } as TextStyle,
  sectionLabelSpaced: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  } as TextStyle,
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
  options: {
    gap: 16,
  } as ViewStyle,
});
