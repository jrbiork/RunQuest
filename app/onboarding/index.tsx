import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { ExperienceLevel } from '../../src/types';
import { spacing } from '../../src/constants/theme';

const OPTIONS: { value: ExperienceLevel; label: string; description: string; emoji: string }[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Just getting started with running or returning after a break.',
    emoji: '🌱',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Run regularly and want to push further and faster.',
    emoji: '🏃',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Experienced runner training for performance goals.',
    emoji: '⚡',
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
      title={"What's your running experience?"}
      subtitle="We'll build your first week of missions based on this."
      onNext={handleNext}
      nextDisabled={!selected}
      showBack={false}
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
