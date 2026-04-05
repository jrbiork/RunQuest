import { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OptionCard } from '../../src/components/onboarding/OptionCard';
import { useOnboardingDraft } from './_layout';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import type { GoalAnswer, UserProfile } from '../../src/types';
import {
  computePersonaId,
  experienceAnswerToLevel,
  preferredDaysFromScheduleDays,
  inferExperienceFromVolumeAndGoal,
  goalAnswerToRunningGoal,
  type PersonaSurveyAnswers,
} from '../../src/utils/personaScoring';

const OPTIONS: {
  value: GoalAnswer;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'started', label: 'Just getting started', description: 'Learning the ropes', icon: 'flag' },
  { value: 'fit', label: 'Get fit / lose weight', description: 'Health first', icon: 'favorite' },
  { value: 'endurance', label: 'Build endurance', description: 'Go longer, stronger', icon: 'terrain' },
  { value: 'speed', label: 'Improve speed / performance', description: 'Push the pace', icon: 'speed' },
  { value: 'event', label: 'Train for an event', description: 'Race day ready', icon: 'emoji-events' },
];

export default function OnboardingGoalScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<GoalAnswer | null>(draft.current.goal ?? null);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const generateMissionsFromProfile = useMissionsStore((s) => s.generateMissionsFromProfile);

  const handleDeploy = () => {
    if (!selected) return;
    const d = draft.current;
    const mode = d.defaultActivityMode ?? 'cycle';
    const days = Math.max(1, Math.min(7, Math.round(d.trainingDaysPerWeek ?? 3)));
    if (mode === 'run' && !d.runDistance) return;
    if (mode === 'cycle' && !d.cycleDistance) return;

    draft.current.goal = selected;

    const experience = inferExperienceFromVolumeAndGoal(
      selected,
      days,
      mode,
      mode === 'run' ? d.runDistance ?? null : null,
      mode === 'cycle' ? d.cycleDistance ?? null : null,
    );

    const survey: PersonaSurveyAnswers = {
      defaultActivityMode: mode,
      trainingDaysPerWeek: days,
      runDistance: mode === 'run' ? d.runDistance ?? null : null,
      cycleDistance: mode === 'cycle' ? d.cycleDistance ?? null : null,
      experience,
      goal: selected,
    };

    const personaId = computePersonaId(survey);
    const preferredDays = preferredDaysFromScheduleDays(days);
    const runningGoal = goalAnswerToRunningGoal(selected);

    const profile: UserProfile = {
      personaId,
      defaultActivityMode: mode,
      preferredDays,
      weeklyTargetRuns: preferredDays.length,
      experienceLevel: experienceAnswerToLevel(experience),
      runningGoal,
    };

    completeOnboarding(profile);
    generateMissionsFromProfile(profile, useUserStore.getState().xp);
    router.replace('/onboarding/tailoring');
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={3}
      title="What's your main goal?"
      subtitle="Objective"
      onNext={handleDeploy}
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
