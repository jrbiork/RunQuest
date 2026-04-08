import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import type { ActivityMode, SustainablePaceAnswer, UserProfile } from '../../src/types';
import {
  computePersonaId,
  preferredDaysFromScheduleDays,
  startingClassLevelFromDistanceAndPace,
  type PersonaSurveyAnswers,
} from '../../src/utils/personaScoring';

const OPTIONS: {
  value: SustainablePaceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'unknown', label: "I don't know my pace yet", description: 'No pace benchmark yet', icon: 'help-outline' },
  { value: 'slower_than_7', label: 'Slower than 7:00/km', description: 'Easy conversational pace', icon: 'speed' },
  { value: '6_to_7', label: '6:00-7:00/km', description: 'Steady sustainable pace', icon: 'speed' },
  { value: '5_to_6', label: '5:00-6:00/km', description: 'Strong endurance pace', icon: 'speed' },
  { value: 'faster_than_5', label: 'Faster than 5:00/km', description: 'High performance pace', icon: 'bolt' },
];

const CYCLE_OPTIONS: {
  value: SustainablePaceAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'unknown', label: "I don't know my ride pace yet", description: 'No pace benchmark yet', icon: 'help-outline' },
  { value: 'slower_than_7', label: 'Slower than 3:00/km', description: 'Easy spinning pace', icon: 'speed' },
  { value: '6_to_7', label: '2:30-3:00/km', description: 'Steady endurance pace', icon: 'speed' },
  { value: '5_to_6', label: '2:00-2:30/km', description: 'Strong sustained pace', icon: 'speed' },
  { value: 'faster_than_5', label: 'Faster than 2:00/km', description: 'High performance pace', icon: 'bolt' },
];

export default function OnboardingGoalScreen() {
  const draft = useOnboardingDraft();
  const mode: ActivityMode = draft.current.defaultActivityMode ?? 'run';
  const [selected, setSelected] = useState<SustainablePaceAnswer | null>(
    draft.current.sustainablePace ?? null,
  );
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const generateMissionsFromProfile = useMissionsStore((s) => s.generateMissionsFromProfile);

  const handleDeploy = () => {
    if (!selected) return;
    const d = draft.current;
    const days = Math.max(1, Math.min(7, Math.round(d.trainingDaysPerWeek ?? 3)));
    if (!d.distanceCapacity) return;
    draft.current.sustainablePace = selected;

    const survey: PersonaSurveyAnswers = {
      defaultActivityMode: mode,
      trainingDaysPerWeek: days,
      runDistance: null,
      cycleDistance: null,
      experience: 'lt3m',
      goal: 'fit',
    };

    const personaId = computePersonaId(survey);
    const preferredDays = preferredDaysFromScheduleDays(days);
    const startingClassLevel = startingClassLevelFromDistanceAndPace(
      d.distanceCapacity,
      selected,
    );

    const profile: UserProfile = {
      personaId,
      defaultActivityMode: mode,
      preferredDays,
      weeklyTargetRuns: preferredDays.length,
      startingClassLevel,
      experienceLevel: 'beginner',
      runningGoal: 'consistency',
    };

    completeOnboarding(profile);
    generateMissionsFromProfile(profile, useUserStore.getState().xp, startingClassLevel);
    router.replace('/onboarding/tailoring');
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={3}
      title={
        mode === 'run'
          ? 'What pace feels sustainable for you right now?'
          : 'What ride pace feels sustainable for you right now?'
      }
      subtitle="Sustainable pace"
      onNext={handleDeploy}
      nextLabel="Continue"
      nextDisabled={!selected}
    >
      <View style={styles.options}>
        {(mode === 'run' ? OPTIONS : CYCLE_OPTIONS).map((o) => (
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
