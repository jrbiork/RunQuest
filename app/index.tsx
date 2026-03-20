import { Redirect } from 'expo-router';
import { useUserStore } from '../src/store/userStore';

export default function Index() {
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
