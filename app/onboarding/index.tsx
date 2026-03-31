import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type { PersonaId } from '../../src/types';
import { PERSONA_LABELS } from '../../src/constants/campaigns';
import { spacing } from '../../src/constants/theme';

const PERSONAS: PersonaId[] = ['ghost', 'scout', 'operative', 'elite', 'vanguard'];

export default function PersonaScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<PersonaId | null>(
    draft.current.personaId ?? null,
  );

  const handleNext = () => {
    if (!selected) return;
    draft.current.personaId = selected;
    router.push('/onboarding/run-days');
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={3}
      title="Field Classification"
      subtitle="Choose Your Operative"
      onNext={handleNext}
      nextLabel="Confirm Persona"
      nextDisabled={!selected}
      showBack={false}
    >
      <View style={styles.options}>
        {PERSONAS.map((persona) => {
          const meta = PERSONA_LABELS[persona];
          return (
            <OptionCard
              key={persona}
              label={meta.label}
              description={meta.description}
              icon={meta.icon}
              selected={selected === persona}
              onPress={() => setSelected(persona)}
            />
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
});
