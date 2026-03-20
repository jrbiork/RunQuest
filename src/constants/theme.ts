// Design tokens for RunQuest — bright, friendly, Duolingo-inspired energy
import { Platform } from 'react-native';

export const colors = {
  // Brand
  primary: '#4CAF50',       // Green — main CTA, completed states
  primaryLight: '#E8F5E9',  // Light green background
  primaryDark: '#388E3C',

  // Accents
  orange: '#FF9800',        // Streak fire
  orangeLight: '#FFF3E0',
  purple: '#9C27B0',        // XP
  purpleLight: '#F3E5F5',
  blue: '#2196F3',          // Level / info
  blueLight: '#E3F2FD',
  red: '#F44336',           // Danger / missed streak
  redLight: '#FFEBEE',
  yellow: '#FFC107',        // Stars / bonus

  // Mission type colors
  missionEasy: '#4CAF50',
  missionTempo: '#FF9800',
  missionLong: '#2196F3',
  missionRecovery: '#26C6DA',
  missionInterval: '#9C27B0',

  // Neutrals
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#EEEEEE',
  borderActive: '#4CAF50',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#BDBDBD',
  textInverse: '#FFFFFF',

  // Tab bar
  tabActive: '#4CAF50',
  tabInactive: '#BDBDBD',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 38,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Platform-aware shadow helper: RN shadow props on iOS/Android, boxShadow on web
function makeShadow(
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): Record<string, unknown> {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${y}px ${blur}px rgba(0,0,0,${opacity})` };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation,
  };
}

export const shadows = {
  sm: makeShadow(1, 6, 0.06, 2),
  md: makeShadow(2, 12, 0.08, 4),
  lg: makeShadow(4, 20, 0.12, 8),
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

// Mission type → color and icon mapping
export const missionConfig = {
  easy: {
    color: colors.missionEasy,
    bgColor: colors.primaryLight,
    label: 'Easy Run',
    icon: 'directions-run',
  },
  tempo: {
    color: colors.missionTempo,
    bgColor: colors.orangeLight,
    label: 'Tempo',
    icon: 'speed',
  },
  long: {
    color: colors.missionLong,
    bgColor: colors.blueLight,
    label: 'Long Run',
    icon: 'terrain',
  },
  recovery: {
    color: colors.missionRecovery,
    bgColor: '#E0F7FA',
    label: 'Recovery',
    icon: 'self-improvement',
  },
  interval: {
    color: colors.missionInterval,
    bgColor: colors.purpleLight,
    label: 'Intervals',
    icon: 'flash-on',
  },
} as const;
