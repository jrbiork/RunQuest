import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { RunningGoal } from '../../src/types';
import { spacing } from '../../src/constants/theme';

const OPTIONS: { value: RunningGoal; label: string; description: string; emoji: string }[] = [
  {
    value: 'habit',
    label: 'Build a habit',
    description: 'Run consistently every week and make it stick.',
    emoji: '🔥',
  },
  {
    value: 'consistency',
    label: 'Run more consistently',
    description: 'Stop the on-again, off-again cycle for good.',
    emoji: '📅',
  },
  {
    value: 'distance',
    label: 'Improve distance',
    description: 'Build up to running longer and further.',
    emoji: '🗺️',
  },
  {
    value: 'speed',
    label: 'Train for speed',
    description: 'Get faster with tempo runs and intervals.',
    emoji: '⚡',
  },
  {
    value: 'race',
    label: 'Prepare for a race',
    description: '5K, 10K, half marathon — get race-ready.',
    emoji: '🏆',
  },
];

export default function GoalScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<RunningGoal | null>(
    draft.current.runningGoal ?? null,
  );

  const handleNext = () => {
    if (!selected) return;
    draft.current.runningGoal = selected;
    router.push('/onboarding/weekly-target');
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={5}
      title="What's your main running goal?"
      subtitle="This shapes the type of missions you'll get."
      onNext={handleNext}
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
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
});
