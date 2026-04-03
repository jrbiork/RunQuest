import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type {
  ActivityMode,
  CycleDistanceAnswer,
  RunDistanceAnswer,
} from '../../src/types';

const RUN_OPTS: {
  value: RunDistanceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'lt3',
    label: '< 3 km',
    description: 'Short sessions',
    icon: 'straighten',
  },
  {
    value: '3-5',
    label: '3 – 5 km',
    description: 'Typical easy distance',
    icon: 'straighten',
  },
  {
    value: '5-10',
    label: '5 – 10 km',
    description: 'Solid midweek run',
    icon: 'straighten',
  },
  {
    value: '10plus',
    label: '10+ km',
    description: 'Long or race-ready',
    icon: 'straighten',
  },
];

const CYCLE_OPTS: {
  value: CycleDistanceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'lt10',
    label: '< 10 km',
    description: 'Short spins',
    icon: 'route',
  },
  {
    value: '10-25',
    label: '10 – 25 km',
    description: 'Regular rides',
    icon: 'route',
  },
  {
    value: '25-60',
    label: '25 – 60 km',
    description: 'Endurance blocks',
    icon: 'route',
  },
  {
    value: '60plus',
    label: '60+ km',
    description: 'Long or event prep',
    icon: 'route',
  },
];

export default function OnboardingDistanceScreen() {
  const draft = useOnboardingDraft();
  const mode: ActivityMode = draft.current.defaultActivityMode ?? 'cycle';
  const [runSel, setRunSel] = useState<RunDistanceAnswer | null>(
    draft.current.runDistance ?? null,
  );
  const [cycleSel, setCycleSel] = useState<CycleDistanceAnswer | null>(
    draft.current.cycleDistance ?? null,
  );

  const handleNext = () => {
    if (mode === 'run') {
      if (!runSel) return;
      draft.current.runDistance = runSel;
      draft.current.cycleDistance = undefined;
    } else {
      if (!cycleSel) return;
      draft.current.cycleDistance = cycleSel;
      draft.current.runDistance = undefined;
    }
    router.push('/onboarding/experience' as any);
  };

  const disabled = mode === 'run' ? runSel === null : cycleSel === null;

  return (
    <OnboardingLayout
      step={3}
      totalSteps={5}
      title={
        mode === 'run'
          ? "What's your typical run distance per week?"
          : "What's your typical ride distance per week?"
      }
      subtitle="Distance"
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={disabled}
    >
      <View style={styles.options}>
        {mode === 'run'
          ? RUN_OPTS.map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                selected={runSel === o.value}
                onPress={() => setRunSel(o.value)}
              />
            ))
          : CYCLE_OPTS.map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                selected={cycleSel === o.value}
                onPress={() => setCycleSel(o.value)}
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
