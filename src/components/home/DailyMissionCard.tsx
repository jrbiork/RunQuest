import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Mission } from '../../types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDuration } from '../../utils/xpCalculator';
import { formatMissionTargetDistance } from '../../utils/missionTargetPace';
import { stripEmojis } from '../../utils/stripEmojis';

const MISSION_TARGET_ICON_SIZE = 28;

interface DailyMissionCardProps {
  mission: Mission;
  onStartRun: () => void;
  /** Current scavenger level accent — XP pill uses lighter fill + darker label. */
  levelAccentColor: string;
}

export function DailyMissionCard({
  mission,
  onStartRun,
  levelAccentColor,
}: DailyMissionCardProps) {
  const desc = stripEmojis(mission.description).trim();

  return (
    <TouchableOpacity
      style={[styles.wrapper, styles.card]}
      onPress={onStartRun}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Open mission briefing: ${stripEmojis(mission.title)}`}
    >
      <Text style={styles.title}>{stripEmojis(mission.title)}</Text>
      <Text style={styles.subtitle}>{stripEmojis(mission.subtitle)}</Text>

      <View style={styles.statsBlock}>
        <View style={styles.statsRow}>
          <View style={styles.activityColumn}>
            <Text style={styles.targetLabel}>Run target</Text>
            <View style={styles.targetMetricBlock}>
              <View style={styles.runTargetRow}>
                <MaterialIcons
                  name="directions-run"
                  size={MISSION_TARGET_ICON_SIZE}
                  color={colors.textSecondary}
                />
                <View style={styles.runTargetTextCol}>
                  <Text style={styles.targetLinePrimary}>
                    {formatMissionTargetDistance(mission.targetDistanceKm)}
                  </Text>
                  <Text style={styles.targetLinePrimary}>
                    {mission.targetDurationMin <= 0
                      ? '–'
                      : formatDuration(mission.targetDurationMin)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.activityColumnRight}>
            <Text style={[styles.targetLabel, styles.targetLabelRight]}>
              Cycle target
            </Text>
            <View style={styles.targetMetricBlock}>
              <View style={styles.cycleTargetRow}>
                <MaterialIcons
                  name="directions-bike"
                  size={MISSION_TARGET_ICON_SIZE}
                  color={colors.textSecondary}
                />
                <View style={styles.cycleTargetTextCol}>
                  <Text style={styles.targetLinePrimary}>
                    {formatMissionTargetDistance(
                      mission.targetCyclingDistanceKm,
                    )}
                  </Text>
                  <Text style={styles.targetLinePrimary}>
                    {mission.targetCyclingDurationMin <= 0
                      ? '–'
                      : formatDuration(mission.targetCyclingDurationMin)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {desc.length > 0 && (
        <View style={styles.briefingBlock}>
          <Text style={styles.briefingLabel}>Mission briefing</Text>
          <Text style={styles.briefingBody} numberOfLines={10}>
            {desc}
          </Text>
        </View>
      )}

      <View style={styles.xpFooter}>
        <XPBadge
          xp={mission.xpReward}
          size="sm"
          compact
          accentColor={levelAccentColor}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.md,
  } as ViewStyle,
  card: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    lineHeight: 20,
  } as TextStyle,
  statsBlock: {
    marginTop: spacing.md,
    width: '100%',
  } as ViewStyle,
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  } as ViewStyle,
  activityColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 4,
  } as ViewStyle,
  activityColumnRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 4,
  } as ViewStyle,
  targetLabel: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  targetLabelRight: {
    alignSelf: 'flex-end',
    textAlign: 'right',
  } as TextStyle,
  targetMetricBlock: {
    alignSelf: 'stretch',
    width: '100%',
    gap: 4,
  } as ViewStyle,
  runTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
  } as ViewStyle,
  runTargetTextCol: {
    gap: 2,
    alignItems: 'flex-start',
  } as ViewStyle,
  cycleTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.sm,
  } as ViewStyle,
  cycleTargetTextCol: {
    gap: 2,
    alignItems: 'flex-start',
  } as ViewStyle,
  targetLinePrimary: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    textAlign: 'left',
  } as TextStyle,
  briefingBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  } as ViewStyle,
  briefingLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  briefingBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  xpFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.md,
  } as ViewStyle,
});
