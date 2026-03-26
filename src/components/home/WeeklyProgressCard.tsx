import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../constants/theme';
import { formatDistance } from '../../utils/xpCalculator';

interface WeeklyProgressCardProps {
  runsCompleted: number;
  runsTarget: number;
  distanceCompletedKm: number;
  distanceTargetKm: number;
  mode: 'runs' | 'distance';
  dateRange?: string;
}

export function WeeklyProgressCard({
  runsCompleted,
  runsTarget,
  distanceCompletedKm,
  distanceTargetKm,
  mode,
  dateRange,
}: WeeklyProgressCardProps) {
  const runsProgress = runsTarget > 0 ? Math.min(runsCompleted / runsTarget, 1) : 0;
  const distanceProgress = distanceTargetKm > 0 ? Math.min(distanceCompletedKm / distanceTargetKm, 1) : 0;

  const primaryProgress = mode === 'runs' ? runsProgress : distanceProgress;
  const isComplete = primaryProgress >= 1;

  const dayDots = Array.from({ length: runsTarget }, (_, i) => i < runsCompleted);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
          <View>
            <Text style={styles.title}>This Week</Text>
            {dateRange && <Text style={styles.dateRange}>{dateRange}</Text>}
          </View>
        </View>
        {isComplete && (
          <View style={styles.completeBadge}>
            <MaterialIcons name="check-circle" size={14} color={colors.primary} />
            <Text style={styles.completeText}>Goal reached!</Text>
          </View>
        )}
      </View>

      {/* Mode-specific display */}
      {mode === 'runs' ? (
        <View style={styles.body}>
          <View style={styles.dotsRow}>
            {dayDots.map((done, i) => (
              <View
                key={i}
                style={[styles.dot, done ? styles.dotDone : styles.dotEmpty]}
              >
                {done && <MaterialIcons name="check" size={12} color="#fff" />}
              </View>
            ))}
          </View>
          <Text style={styles.countText}>
            <Text style={styles.countBold}>{runsCompleted}</Text>
            <Text style={styles.countDim}> / {runsTarget} sorties</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.countText}>
            <Text style={styles.countBold}>{formatDistance(distanceCompletedKm)}</Text>
            <Text style={styles.countDim}> / {formatDistance(distanceTargetKm)}</Text>
          </Text>
        </View>
      )}

      <ProgressBar
        progress={primaryProgress}
        color={isComplete ? colors.primary : colors.primary}
        backgroundColor={colors.primaryLight}
        height={8}
        style={styles.bar}
      />

      {mode === 'distance' && (
        <Text style={styles.subText}>
          {formatDistance(Math.max(distanceTargetKm - distanceCompletedKm, 0))} to go
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  dateRange: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 1,
  } as TextStyle,
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 3,
  } as ViewStyle,
  completeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  } as TextStyle,
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  } as ViewStyle,
  dot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dotDone: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  dotEmpty: {
    backgroundColor: colors.border,
  } as ViewStyle,
  countText: {
    fontSize: fontSizes.md,
  } as TextStyle,
  countBold: {
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    fontSize: fontSizes.xl,
  } as TextStyle,
  countDim: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  } as TextStyle,
  bar: {
    marginTop: spacing.xs,
  } as ViewStyle,
  subText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  } as TextStyle,
});
