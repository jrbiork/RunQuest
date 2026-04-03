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
  preferredDaysFromScheduleDays,
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
  const initCampaign = useMissionsStore((s) => s.initCampaign);

  const handleDeploy = () => {
    if (!selected) return;
    const d = draft.current;
    const mode = d.defaultActivityMode ?? 'cycle';
    const days = Math.max(1, Math.min(7, Math.round(d.trainingDaysPerWeek ?? 3)));
    const exp = d.experience;
    if (exp === undefined) return;
    if (mode === 'run' && !d.runDistance) return;
    if (mode === 'cycle' && !d.cycleDistance) return;

    draft.current.goal = selected;

    const survey: PersonaSurveyAnswers = {
      defaultActivityMode: mode,
      trainingDaysPerWeek: days,
      runDistance: mode === 'run' ? d.runDistance ?? null : null,
      cycleDistance: mode === 'cycle' ? d.cycleDistance ?? null : null,
      experience: exp,
      goal: selected,
    };

    const personaId = computePersonaId(survey);
    const preferredDays = preferredDaysFromScheduleDays(days);

    const profile: UserProfile = {
      personaId,
      defaultActivityMode: mode,
      preferredDays,
      weeklyTargetRuns: preferredDays.length,
    };

    completeOnboarding(profile);
    initCampaign(profile);
    router.replace('/(tabs)');
  };

  return (
    <OnboardingLayout
      step={5}
      totalSteps={5}
      title="What's your main goal?"
      subtitle="Objective"
      onNext={handleDeploy}
      nextLabel="Deploy operative"
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
