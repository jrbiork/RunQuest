import { createContext, useContext, useRef, useEffect } from 'react';
import { Stack } from 'expo-router';
import type { OnboardingDraft } from '../../src/types';
import { useUserStore } from '../../src/store/userStore';
import {
  startOnboardingAmbient,
  stopOnboardingAmbient,
  syncOnboardingAmbientWithMute,
} from '../../src/services/audioService';

interface OnboardingContextValue {
  draft: React.MutableRefObject<OnboardingDraft>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingDraft() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error('useOnboardingDraft must be used within onboarding layout');
  return ctx.draft;
}

export default function OnboardingLayout() {
  const draft = useRef<OnboardingDraft>({ defaultActivityMode: 'run' });
  const audioMuted = useUserStore((s) => s.audioMuted);

  useEffect(() => {
    startOnboardingAmbient();
    return () => stopOnboardingAmbient();
  }, []);

  useEffect(() => {
    syncOnboardingAmbientWithMute();
  }, [audioMuted]);

  return (
    <OnboardingContext.Provider value={{ draft }}>
      <Stack
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="frequency" options={{ gestureEnabled: false }} />
        <Stack.Screen name="distance" options={{ gestureEnabled: false }} />
        <Stack.Screen name="experience" options={{ gestureEnabled: false }} />
        <Stack.Screen name="goal" options={{ gestureEnabled: false }} />
      </Stack>
    </OnboardingContext.Provider>
  );
}
