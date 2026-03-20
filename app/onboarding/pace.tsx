import { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import type { PaceLevel, UserProfile } from '../../src/types';
import { spacing, colors, radii, fontSizes, fontWeights } from '../../src/constants/theme';

const OPTIONS: { value: PaceLevel; label: string; description: string; icon: string }[] = [
  {
    value: 'easy',
    label: 'EVASION',
    description: 'Move quietly. Survive. Enjoyment over speed.',
    icon: 'explore',
  },
  {
    value: 'moderate',
    label: 'PATROL',
    description: 'Balanced output. Push when needed, hold when not.',
    icon: 'directions-run',
  },
  {
    value: 'fast',
    label: 'ASSAULT',
    description: 'Maximum effort. Every run is a push operation.',
    icon: 'flash-on',
  },
];

export default function PaceScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<PaceLevel | null>(
    draft.current.paceLevel ?? null,
  );

  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const generateWeek = useMissionsStore((s) => s.generateWeek);

  const handleFinish = () => {
    if (!selected) return;
    draft.current.paceLevel = selected;

    const {
      experienceLevel,
      runningGoal,
      weeklyTargetMode,
      weeklyTargetRuns,
      weeklyTargetDistance,
      preferredDays,
      paceLevel,
    } = draft.current;

    if (
      !experienceLevel ||
      !runningGoal ||
      !weeklyTargetMode ||
      weeklyTargetRuns === undefined ||
      weeklyTargetDistance === undefined ||
      !preferredDays ||
      !paceLevel
    ) {
      return;
    }

    const profile: UserProfile = {
      experienceLevel,
      runningGoal,
      weeklyTargetMode,
      weeklyTargetRuns,
      weeklyTargetDistance,
      preferredDays,
      paceLevel,
    };

    completeOnboarding(profile);
    generateWeek(profile);

    router.replace('/(tabs)');
  };

  return (
    <OnboardingLayout
      step={5}
      totalSteps={5}
      title="Operational Mode"
      subtitle="Field Calibration"
      onNext={handleFinish}
      nextLabel="Begin Your Deployment"
      nextDisabled={!selected}
    >
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            selected={selected === opt.value}
            onPress={() => setSelected(opt.value)}
          />
        ))}
      </View>

      {/* Mission assigned panel */}
      <View style={styles.missionPanel}>
        <View style={styles.missionPanelHeader}>
          <View style={styles.missionIconCircle}>
            <MaterialIcons name="gps-fixed" size={18} color={colors.orange} />
          </View>
          <Text style={styles.missionPanelTitle}>MISSION ASSIGNED</Text>
        </View>
        <Text style={styles.missionPanelBody}>
          Your first deployment to Sector 4 is ready. The world needs you to move.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
  missionPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  } as ViewStyle,
  missionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  missionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.orangeLight,
    borderWidth: 1,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  missionPanelTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,
  missionPanelBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,
});
