import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { RunningGoal } from '../../src/types';
import { spacing } from '../../src/constants/theme';

const OPTIONS: { value: RunningGoal; label: string; description: string; icon: string }[] = [
  {
    value: 'habit',
    label: 'SECURE PERIMETER',
    description: 'Establish daily patrol routes. Build the habit.',
    icon: 'shield',
  },
  {
    value: 'consistency',
    label: 'MAINTAIN PROTOCOL',
    description: 'Stop going dark. Keep the signal alive.',
    icon: 'repeat',
  },
  {
    value: 'distance',
    label: 'EXPAND NETWORK',
    description: 'Unlock new zones. Push further each week.',
    icon: 'map',
  },
  {
    value: 'speed',
    label: 'SURGE PROTOCOL',
    description: 'Run hard. React fast. Push your operational limits.',
    icon: 'bolt',
  },
  {
    value: 'race',
    label: 'SUPPLY RUN',
    description: 'Deliver critical assets. Cover the distance.',
    icon: 'local-shipping',
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
      title="Objective"
      subtitle="Primary Mandate"
      onNext={handleNext}
      nextLabel="Select Mandate"
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
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
});
