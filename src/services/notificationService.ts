import { TurboModuleRegistry, Platform } from 'react-native';

// PushNotificationIOS.js passes TurboModuleRegistry.get('PushNotificationManager')
// to NativeEventEmitter at module-load time. On iOS simulators this TurboModule
// returns null, making NativeEventEmitter throw an invariant. Guard the entire
// expo-notifications import so the app degrades gracefully on simulators.
const notificationsAvailable =
  Platform.OS !== 'ios' || !!TurboModuleRegistry.get('PushNotificationManager');

let Notifications: typeof import('expo-notifications') | null = null;
if (notificationsAvailable) {
  try {
    Notifications = require('expo-notifications');
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    Notifications = null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('goal-alerts', {
        name: 'Goal Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleGoalReachedNotification(
  missionTitle: string,
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal Reached!',
        body: `You crushed "${missionTitle}". Tap to finish your run.`,
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // Notification permission may have been denied — silent fail
  }
}
