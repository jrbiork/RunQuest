import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../src/constants/theme';
import { requestNotificationPermissions } from '../src/services/notificationService';
import { useRunSessionStore } from '../src/store/runSessionStore';
// Import side-effect: registers the background location task with expo-task-manager
import '../src/hooks/useGpsTracking';

/** Matches app.json splash.backgroundColor — avoids a flash of a different tone under the native splash. */
const SPLASH_BG = '#0E1210';

// Keep native splash visible until we explicitly hide (after fonts + short minimum time)
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isRunActive = useRunSessionStore((s) => s.isRunActive);
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const id = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 450);
    return () => clearTimeout(id);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={styles.bootPlaceholder}>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Avoid native back-swipe competing with intro’s left swipe */}
        <Stack.Screen name="intro" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="run"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            gestureEnabled: !isRunActive,
          }}
        />
      </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bootPlaceholder: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});
