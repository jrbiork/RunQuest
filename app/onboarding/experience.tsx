import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { ActivityMode, ExperienceAnswer } from '../../src/types';

const OPTIONS: {
  value: ExperienceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'never', label: 'Never', description: 'Just starting out', icon: 'help-outline' },
  { value: 'lt3m', label: '< 3 months', description: 'Building the habit', icon: 'calendar-today' },
  { value: '3-12m', label: '3 – 12 months', description: 'Regular training', icon: 'event' },
  { value: '1-3y', label: '1 – 3 years', description: 'Solid base', icon: 'trending-up' },
  { value: '3yplus', label: '3+ years', description: 'Veteran legs', icon: 'military-tech' },
];

export default function OnboardingExperienceScreen() {
  const draft = useOnboardingDraft();
  const mode: ActivityMode = draft.current.defaultActivityMode ?? 'cycle';
  const verb = mode === 'cycle' ? 'cycling' : 'running';

  const [selected, setSelected] = useState<ExperienceAnswer | null>(
    draft.current.experience ?? null,
  );

  const handleNext = () => {
    if (!selected) return;
    draft.current.experience = selected;
    router.push('/onboarding/goal' as any);
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={5}
      title={`How long have you been ${verb} consistently?`}
      subtitle="Experience"
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={!selected}
    >
      <View style={styles.options}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            icon={o.icon}
            selected={selected === o.value}
            onPress={() => setSelected(o.value)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 16,
  } as ViewStyle,
});
