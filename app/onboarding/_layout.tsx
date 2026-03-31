import { createContext, useContext, useRef } from 'react';
import { Stack } from 'expo-router';
import type { OnboardingDraft } from '../../src/types';

interface OnboardingContextValue {
  draft: React.MutableRefObject<OnboardingDraft>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingDraft() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used within onboarding layout');
  return ctx.draft;
}

export default function OnboardingLayout() {
  const draft = useRef<OnboardingDraft>({});

  return (
    <OnboardingContext.Provider value={{ draft }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="run-days" />
        <Stack.Screen name="mode" />
      </Stack>
    </OnboardingContext.Provider>
  );
}
