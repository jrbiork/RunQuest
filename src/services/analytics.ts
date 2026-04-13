import { NativeModules } from 'react-native';

export const Events = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  // Permissions
  LOCATION_PERMISSION_REQUESTED: 'location_permission_requested',
  LOCATION_PERMISSION_RESULT: 'location_permission_result',
  // Mission
  MISSION_STARTED: 'mission_started',
  MISSION_COMPLETED: 'mission_completed',
  MISSION_ABORTED: 'mission_aborted',
  // Progression
  LEVEL_PROGRESSED: 'level_progressed',
  // GPS
  GPS_TRACKING_STARTED: 'gps_tracking_started',
  GPS_TRACKING_FAILED: 'gps_tracking_failed',
  GPS_INTERRUPTED: 'gps_interrupted',
} as const;

type EventName = (typeof Events)[keyof typeof Events];

type FirebaseAnalyticsInstance = {
  logEvent: (
    analytics: object,
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<void>;
  setUserProperty: (
    analytics: object,
    name: string,
    value: string,
  ) => Promise<void>;
  instance: object;
};

// Lazy-load using the modular API (RNFB v22+).
// Guard with NativeModules check so the app never crashes before native linking.
function getFirebase(): FirebaseAnalyticsInstance | null {
  if (!NativeModules.RNFBAppModule) {
    console.warn('[Analytics] RNFBAppModule not found — Firebase not linked');
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app') as {
      getApp: () => object;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      getAnalytics,
      logEvent: fbLogEvent,
      setUserProperty: fbSetUserProperty,
    } = require('@react-native-firebase/analytics') as {
      getAnalytics: (app: object) => object;
      logEvent: (a: object, name: string, params?: Record<string, unknown>) => Promise<void>;
      setUserProperty: (a: object, name: string, value: string) => Promise<void>;
    };
    const instance = getAnalytics(getApp());
    console.log('[Analytics] Firebase initialized OK, instance:', typeof instance);
    return {
      instance,
      logEvent: fbLogEvent,
      setUserProperty: fbSetUserProperty,
    };
  } catch (e) {
    console.error('[Analytics] Firebase init error:', e);
    return null;
  }
}

export async function logEvent(
  name: EventName,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const fb = getFirebase();
    if (!fb) {
      console.warn('[Analytics] logEvent skipped (no Firebase):', name);
      return;
    }
    console.log('[Analytics] logEvent:', name, params);
    await fb.logEvent(fb.instance, name, params);
    console.log('[Analytics] logEvent sent OK:', name);
  } catch (e) {
    console.error('[Analytics] logEvent error:', name, e);
  }
}

export async function setUserProperty(
  name: string,
  value: string,
): Promise<void> {
  try {
    const fb = getFirebase();
    if (fb) await fb.setUserProperty(fb.instance, name, value);
  } catch {}
}
