// Design tokens for RunQuest: Wasteland Guide — rusted earth, survivalist aesthetic
import { Platform } from 'react-native';

export const colors = {
  // Brand — tactical green = progress, life restored
  primary: '#679058',
  primaryLight: 'rgba(103,144,88,0.15)',
  primaryDark: '#4D6B40',

  // Accents
  orange: '#F68F4D',              // Safety orange — active / selected / highlight
  orangeLight: 'rgba(246,143,77,0.15)',
  purple: '#B95C37',              // Burnt ochre — XP / achievements / warnings
  purpleLight: 'rgba(185,92,55,0.15)',
  blue: '#4F8BA4',                // Steel blue — info / network
  blueLight: 'rgba(79,139,164,0.15)',
  red: '#D9453C',                 // Crimson — danger / missed
  redLight: 'rgba(217,69,60,0.15)',
  yellow: '#F68F4D',              // Reuse safety orange for rewards

  // Named semantic aliases
  ochre: '#B95C37',               // Burnt ochre (same as purple token)
  tacticalGreen: '#679058',       // Tactical green (same as primary token)

  // Mission type colors (limited palette: green / orange / red)
  missionEasy: '#679058',
  missionTempo: '#F68F4D',
  missionLong: '#F68F4D',
  missionRecovery: '#679058',
  missionInterval: '#D9453C',

  // Backgrounds — charcoal green family
  background: '#0E1210',
  surface: '#161B19',
  surfaceElevated: '#1F2623',
  border: '#4F4A42',
  borderActive: '#B95C37',

  // Text — bone / concrete
  textPrimary: '#D4D6CF',
  textSecondary: '#9A968E',
  textTertiary: '#5C5850',
  textInverse: '#0E1210',

  // Tab bar — active is muted bone (not brand green); Deploy FAB stays orange in _layout
  tabActive: '#9A968E',
  tabInactive: '#5C5850',
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
  sm: 4,     // Sharp industrial corners
  md: 6,     // Slightly eased panels
  lg: 8,     // Cards and containers
  xl: 12,    // Larger containers
  xxl: 16,   // Modals / prominent cards
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

// Platform-aware shadow helper — heavier on dark backgrounds for depth
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
  sm: makeShadow(2, 8, 0.5, 3),
  md: makeShadow(4, 16, 0.6, 6),
  lg: makeShadow(8, 28, 0.7, 10),
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
    bgColor: 'rgba(103,144,88,0.12)',
    label: 'Grid Patrol',
    icon: 'flash-on',
  },
  tempo: {
    color: colors.missionTempo,
    bgColor: 'rgba(246,143,77,0.12)',
    label: 'Signal Rush',
    icon: 'wifi',
  },
  long: {
    color: colors.missionLong,
    bgColor: 'rgba(246,143,77,0.12)',
    label: 'Supply Route',
    icon: 'terrain',
  },
  recovery: {
    color: colors.missionRecovery,
    bgColor: 'rgba(103,144,88,0.12)',
    label: 'Scout',
    icon: 'explore',
  },
  interval: {
    color: colors.missionInterval,
    bgColor: 'rgba(217,69,60,0.12)',
    label: 'Surge',
    icon: 'bolt',
  },
} as const;
