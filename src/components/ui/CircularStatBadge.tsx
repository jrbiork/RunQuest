import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontSizes, fontWeights, spacing } from '../../constants/theme';

interface CircularStatBadgeProps {
  value: number | string;
  label: string;
  icon: string;
  ringColor: string;
  /** 0–1 fill ratio for the progress ring. Defaults to 1 (full). */
  progress?: number;
  size?: number;
}

export function CircularStatBadge({
  value,
  label,
  icon,
  ringColor,
  progress = 1,
  size = 80,
}: CircularStatBadgeProps) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, progress)) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.wrapper}>
      {/* SVG ring */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {/* Track */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Fill */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        </Svg>

        {/* Center content */}
        <View style={[styles.center, { width: size, height: size }]}>
          <MaterialIcons name={icon as any} size={18} color={ringColor} />
          <Text style={[styles.value, { color: ringColor }]}>
            {typeof value === 'number' ? String(value) : value}
          </Text>
        </View>
      </View>

      {/* Label below ring */}
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  } as ViewStyle,
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  } as ViewStyle,
  value: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    lineHeight: 18,
  } as TextStyle,
  label: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 70,
  } as TextStyle,
});
