// Design tokens for RunQuest: Rebuild the World — dark post-apocalyptic energy
import { Platform } from 'react-native';

export const colors = {
  // Brand — teal = "life being restored"
  primary: '#4ECCA3',
  primaryLight: 'rgba(78,204,163,0.15)',
  primaryDark: '#2DB88A',

  // Accents
  orange: '#FF6B35',              // Danger / active missions
  orangeLight: 'rgba(255,107,53,0.15)',
  purple: '#7C4DFF',              // XP / levels
  purpleLight: 'rgba(124,77,255,0.15)',
  blue: '#00B4D8',                // Network / signals
  blueLight: 'rgba(0,180,216,0.15)',
  red: '#FF4757',                 // Critical / missed
  redLight: 'rgba(255,71,87,0.15)',
  yellow: '#FFD60A',              // Rewards / stars

  // Mission type colors
  missionEasy: '#4ECCA3',         // Grid Patrol — teal
  missionTempo: '#FF6B35',        // Signal Rush — orange
  missionLong: '#00B4D8',         // Supply Route — blue
  missionRecovery: '#7C4DFF',     // Scout — purple
  missionInterval: '#FFD60A',     // Surge — yellow

  // Backgrounds
  background: '#0A0A0F',
  surface: '#12121C',
  surfaceElevated: '#1C1C2C',
  border: '#2A2A3E',
  borderActive: '#4ECCA3',

  // Text
  textPrimary: '#E8E8F4',
  textSecondary: '#8A8AA8',
  textTertiary: '#4A4A5C',
  textInverse: '#0A0A0F',

  // Tab bar
  tabActive: '#4ECCA3',
  tabInactive: '#4A4A5C',
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

// Platform-aware shadow helper — on dark surfaces we use subtle outer glow
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
  sm: makeShadow(2, 8, 0.4, 3),
  md: makeShadow(4, 16, 0.5, 6),
  lg: makeShadow(8, 28, 0.6, 10),
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

// Mission type → color and icon mapping (post-apocalyptic narrative labels)
export const missionConfig = {
  easy: {
    color: colors.missionEasy,
    bgColor: 'rgba(78,204,163,0.12)',
    label: 'Grid Patrol',
    icon: 'flash-on',
  },
  tempo: {
    color: colors.missionTempo,
    bgColor: 'rgba(255,107,53,0.12)',
    label: 'Signal Rush',
    icon: 'wifi',
  },
  long: {
    color: colors.missionLong,
    bgColor: 'rgba(0,180,216,0.12)',
    label: 'Supply Route',
    icon: 'terrain',
  },
  recovery: {
    color: colors.missionRecovery,
    bgColor: 'rgba(124,77,255,0.12)',
    label: 'Scout',
    icon: 'explore',
  },
  interval: {
    color: colors.missionInterval,
    bgColor: 'rgba(255,214,10,0.12)',
    label: 'Surge',
    icon: 'bolt',
  },
} as const;
