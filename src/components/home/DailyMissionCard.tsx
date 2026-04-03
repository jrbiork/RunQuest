import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Mission } from '../../types';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDistance, formatDuration } from '../../utils/xpCalculator';
import { stripEmojis } from '../../utils/stripEmojis';

interface DailyMissionCardProps {
  mission: Mission;
  onStartRun: () => void;
}

export function DailyMissionCard({ mission, onStartRun }: DailyMissionCardProps) {
  const config = missionConfig[mission.type];

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[config.color, config.color + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typePill}>
            <MaterialIcons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          <XPBadge xp={mission.xpReward} size="sm" />
        </View>

        {/* Mission name */}
        <Text style={styles.title}>{stripEmojis(mission.title)}</Text>
        <Text style={styles.subtitle}>{stripEmojis(mission.subtitle)}</Text>

        {/* Stats row — one group per activity */}
        <View style={styles.statsRow}>
          <View style={styles.activityGroup}>
            <MaterialIcons name="directions-run" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValue}>{formatDistance(mission.targetDistanceKm)}</Text>
            <Text style={styles.statDim}>~{formatDuration(mission.targetDurationMin)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.activityGroup}>
            <MaterialIcons name="directions-bike" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValue}>{formatDistance(mission.targetCyclingDistanceKm)}</Text>
            <Text style={styles.statDim}>~{formatDuration(mission.targetCyclingDurationMin)}</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.startButton} onPress={onStartRun} activeOpacity={0.9}>
          <MaterialIcons name="play-arrow" size={22} color={config.color} />
          <Text style={[styles.startLabel, { color: config.color }]}>Start Mission</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.md,
  } as ViewStyle,
  gradient: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    gap: spacing.sm,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  } as ViewStyle,
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: '#fff',
    marginTop: spacing.xs,
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: fontWeights.medium,
    lineHeight: 20,
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  } as ViewStyle,
  activityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#fff',
  } as TextStyle,
  statDim: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: fontWeights.medium,
  } as TextStyle,
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
  } as ViewStyle,
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  } as ViewStyle,
  startLabel: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  } as TextStyle,
});
