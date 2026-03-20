import { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import type { PaceLevel, UserProfile } from '../../src/types';
import { spacing, colors, radii, fontSizes, fontWeights } from '../../src/constants/theme';

const OPTIONS: { value: PaceLevel; label: string; description: string; emoji: string }[] = [
  {
    value: 'easy',
    label: 'Easy & comfortable',
    description: "I run to enjoy it — I'm not chasing pace.",
    emoji: '🐢',
  },
  {
    value: 'moderate',
    label: 'Moderate effort',
    description: 'I like a mix of easy miles and occasional pushes.',
    emoji: '🏃',
  },
  {
    value: 'fast',
    label: 'Fast & competitive',
    description: "I'm always trying to beat my last time.",
    emoji: '🚀',
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

    // Validate all fields are present before completing
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
      title="How do you like to run?"
      subtitle="This helps us set realistic mission distances and pacing cues."
      onNext={handleFinish}
      nextLabel="Start My Journey 🚀"
      nextDisabled={!selected}
    >
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            emoji={opt.emoji}
            selected={selected === opt.value}
            onPress={() => setSelected(opt.value)}
          />
        ))}
      </View>

      {/* Reassurance note */}
      <View style={styles.note}>
        <Text style={styles.noteText}>
          🎉 You're all set! Your first week of personalised missions is about to be generated.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
  note: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  } as ViewStyle,
  noteText: {
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  } as TextStyle,
});
