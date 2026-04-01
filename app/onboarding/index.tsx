import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { ActivityMode } from '../../src/types';
import { spacing } from '../../src/constants/theme';

const OPTIONS: { value: ActivityMode; label: string; description: string; icon: string }[] = [
  {
    value: 'run',
    label: 'RUNNING',
    description: 'On foot. Every step restores a zone.',
    icon: 'directions-run',
  },
  {
    value: 'cycle',
    label: 'CYCLING',
    description: 'On wheels. Cover more ground, faster.',
    icon: 'directions-bike',
  },
];

export default function OnboardingFocusScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<ActivityMode>(
    draft.current.defaultActivityMode ?? 'run',
  );

  const handleNext = () => {
    draft.current.defaultActivityMode = selected;
    router.push('/onboarding/frequency' as any);
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={5}
      title="What do you want to focus on?"
      subtitle="Training focus"
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={false}
      showBack={false}
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
