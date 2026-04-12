import { useState, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { ActivityMode } from '../../src/types';
import { spacing } from '../../src/constants/theme';
import { logEvent, Events } from '../../src/services/analytics';

const OPTIONS: {
  value: ActivityMode;
  label: string;
  description: string;
  icon: string;
}[] = [
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

  useEffect(() => {
    void logEvent(Events.ONBOARDING_STEP_VIEWED, {
      step_name: 'activity_mode',
    });
  }, []);

  const handleNext = () => {
    draft.current.defaultActivityMode = selected;
    router.push('/onboarding/volume' as any);
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={3}
      title="What's your main focus?"
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
