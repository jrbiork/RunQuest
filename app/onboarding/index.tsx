import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { ExperienceLevel } from '../../src/types';
import { spacing } from '../../src/constants/theme';

const OPTIONS: { value: ExperienceLevel; label: string; description: string; icon: string }[] = [
  {
    value: 'beginner',
    label: 'RECRUIT',
    description: 'Minimal experience. Focus on evasion and survival.',
    icon: 'military-tech',
  },
  {
    value: 'intermediate',
    label: 'OPERATIVE',
    description: 'Consistent sorties. A conditioned, reliable runner.',
    icon: 'security',
  },
  {
    value: 'advanced',
    label: 'VANGUARD',
    description: 'High-endurance asset. Elite operational status.',
    icon: 'whatshot',
  },
];

export default function ExperienceScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<ExperienceLevel | null>(
    draft.current.experienceLevel ?? null,
  );

  const handleNext = () => {
    if (!selected) return;
    draft.current.experienceLevel = selected;
    router.push('/onboarding/goal');
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={5}
      title="Classification"
      subtitle="Asset Assessment"
      onNext={handleNext}
      nextLabel="Confirm Classification"
      nextDisabled={!selected}
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
