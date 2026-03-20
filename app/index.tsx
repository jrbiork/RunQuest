import { Redirect } from 'expo-router';
import { useUserStore } from '../src/store/userStore';

export default function Index() {
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const hasSeenIntro = useUserStore((s) => s.hasSeenIntro);

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  if (!hasSeenIntro) {
    return <Redirect href="/intro" />;
  }

  return <Redirect href="/onboarding" />;
}
