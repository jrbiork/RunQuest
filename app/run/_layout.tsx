import { Stack } from 'expo-router';

export default function RunLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="active" options={{ gestureEnabled: false }} />
      <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
