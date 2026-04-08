import { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import type {
  ActivityMode,
  DistanceCapacityAnswer,
} from '../../src/types';
import {
  spacing,
} from '../../src/constants/theme';
const RUN_OPTS: {
  value: DistanceCapacityAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'none', label: "I can't run continuously yet", description: 'Walk-run start', icon: 'directions-walk' },
  { value: 'up_to_1', label: 'Up to 1 km', description: 'Short continuous effort', icon: 'straighten' },
  { value: '1_3', label: '1-3 km', description: 'Building base fitness', icon: 'straighten' },
  { value: '3_5', label: '3-5 km', description: 'Comfortable steady run', icon: 'straighten' },
  { value: '5_10', label: '5-10 km', description: 'Strong endurance base', icon: 'straighten' },
  { value: '10_plus', label: '10+ km', description: 'Long-distance ready', icon: 'straighten' },
];

const CYCLE_OPTS: {
  value: DistanceCapacityAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'none', label: "I can't cycle continuously yet", description: 'Easy-spin start', icon: 'pedal-bike' },
  { value: 'up_to_1', label: 'Up to 5 km', description: 'Short continuous ride', icon: 'route' },
  { value: '1_3', label: '5-15 km', description: 'Building ride endurance', icon: 'route' },
  { value: '3_5', label: '15-30 km', description: 'Comfortable steady ride', icon: 'route' },
  { value: '5_10', label: '30-60 km', description: 'Strong endurance base', icon: 'route' },
  { value: '10_plus', label: '60+ km', description: 'Long-distance ready', icon: 'route' },
];

export default function OnboardingVolumeScreen() {
  const draft = useOnboardingDraft();
  const mode: ActivityMode = draft.current.defaultActivityMode ?? 'run';
  const [selected, setSelected] = useState<DistanceCapacityAnswer | null>(
    draft.current.distanceCapacity ?? null,
  );

  const handleNext = () => {
    if (!selected) return;
    draft.current.distanceCapacity = selected;
    router.push('/onboarding/goal' as any);
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={3}
      title={
        mode === 'run'
          ? 'What is the longest run you can comfortably do right now without stopping?'
          : 'What is the longest ride you can comfortably do right now without stopping?'
      }
      subtitle="Distance capacity"
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={!selected}
    >
      <View style={styles.options}>
        {(mode === 'run' ? RUN_OPTS : CYCLE_OPTS).map((o) => (
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
