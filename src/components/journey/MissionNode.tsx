import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Mission, CompletedRun } from '../../types';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDistance } from '../../utils/xpCalculator';
import { getRelativeDateLabel } from '../../utils/dateUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatPace(distKm: number, durMin: number): string {
  if (distKm < 0.01) return '–';
  const secPerKm = (durMin * 60) / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

// ─── Completed result card (shown instead of the normal node content) ─────────

function CompletedResultCard({
  mission,
  run,
  onShare,
}: {
  mission: Mission;
  run: CompletedRun;
  onShare: () => void;
}) {
  const config = missionConfig[mission.type];
  const goalMet = run.goalMet;

  return (
    <View style={[rc.card, goalMet ? rc.cardGoal : rc.cardEarly]}>
      {/* Status banner + share button row */}
      <View style={rc.bannerRow}>
        <View style={[rc.banner, goalMet ? rc.bannerGoal : rc.bannerEarly]}>
          <MaterialIcons
            name={goalMet ? 'emoji-events' : 'check-circle'}
            size={16}
            color={goalMet ? '#fff' : colors.primaryDark}
          />
          <Text style={[rc.bannerText, goalMet ? rc.bannerTextGoal : rc.bannerTextEarly]}>
            {goalMet ? 'Goal achieved!' : 'Completed · Finished early'}
          </Text>
        </View>
        <TouchableOpacity onPress={onShare} style={rc.shareBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="ios-share" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Mission label + date */}
      <View style={rc.headerRow}>
        <View style={[rc.typePill, { backgroundColor: config.bgColor }]}>
          <MaterialIcons name={config.icon as any} size={12} color={config.color} />
          <Text style={[rc.typeText, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={rc.dateText}>{getRelativeDateLabel(mission.scheduledDate)}</Text>
      </View>

      <Text style={rc.missionTitle}>{mission.title}</Text>

      {/* Actual stats grid */}
      <View style={rc.statsGrid}>
        <StatChip
          icon="straighten"
          value={formatDistance(run.distanceKm)}
          label="Distance"
          color={colors.blue}
        />
        <StatChip
          icon="timer"
          value={formatDuration(run.durationMin)}
          label="Time"
          color={colors.orange}
        />
        <StatChip
          icon="speed"
          value={formatPace(run.distanceKm, run.durationMin)}
          label="Pace"
          color={colors.purple}
        />
      </View>

      {/* XP footer */}
      <View style={rc.xpRow}>
        <MaterialIcons name="star" size={14} color={colors.yellow} />
        <Text style={rc.xpText}>+{run.xpEarned} XP earned</Text>
      <View style={rc.streakPill}>
        <MaterialIcons name="local-fire-department" size={12} color={colors.orange} />
        <Text style={rc.streakText}>Day {run.streakDay}</Text>
      </View>
      </View>
    </View>
  );
}

function StatChip({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={rc.chip}>
      <MaterialIcons name={icon as any} size={14} color={color} />
      <Text style={[rc.chipValue, { color }]}>{value}</Text>
      <Text style={rc.chipLabel}>{label}</Text>
    </View>
  );
}

// ─── Main MissionNode ────────────────────────────────────────────────────────

interface MissionNodeProps {
  mission: Mission;
  completedRun?: CompletedRun;
  onPress: () => void;
  onShare?: () => void;
  isLast?: boolean;
}

export function MissionNode({ mission, completedRun, onPress, onShare, isLast = false }: MissionNodeProps) {
  const config = missionConfig[mission.type];
  const isCompleted = mission.status === 'completed';
  const isActive = mission.status === 'active';
  const isLocked = mission.status === 'locked';

  // Pulse animation for active node
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [isActive, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.nodeWrapper}>
      {/* Connector line */}
      {!isLast && (
        <View style={[
          styles.connector,
          isCompleted && styles.connectorDone,
        ]} />
      )}

      {/* Completed state — rich result card, non-interactive */}
      {isCompleted && completedRun ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.touchable}>
          <CompletedResultCard mission={mission} run={completedRun} onShare={onShare ?? (() => {})} />
        </TouchableOpacity>
      ) : (
        /* Active / upcoming / locked — standard node */
        <TouchableOpacity
          onPress={onPress}
          disabled={isLocked}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          <Animated.View
            style={[
              styles.node,
              isActive && [styles.nodeActive, { borderColor: config.color, ...shadows.md }],
              isLocked && styles.nodeLocked,
              animStyle,
            ]}
          >
            {/* Icon circle */}
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isLocked ? colors.border : config.color },
              ]}
            >
              {isLocked ? (
                <MaterialIcons name="lock" size={20} color={colors.textTertiary} />
              ) : (
                <MaterialIcons name={config.icon as any} size={20} color="#fff" />
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.contentHeader}>
                <View style={[styles.typePill, { backgroundColor: isLocked ? colors.border : config.bgColor }]}>
                  <Text style={[styles.typeText, { color: isLocked ? colors.textTertiary : config.color }]}>
                    {config.label}
                  </Text>
                </View>
                <Text style={styles.dateLabel}>{getRelativeDateLabel(mission.scheduledDate)}</Text>
              </View>

              <Text style={[styles.missionTitle, isLocked && styles.textLocked]}>
                {mission.title}
              </Text>
              <Text style={[styles.missionSubtitle, isLocked && styles.textLocked]} numberOfLines={1}>
                {mission.subtitle}
              </Text>

              <View style={styles.stats}>
                <Text style={[styles.statText, isLocked && styles.textLocked]}>
                  {formatDistance(mission.targetDistanceKm)}
                </Text>
                {!isLocked && <XPBadge xp={mission.xpReward} size="sm" />}
              </View>
            </View>

            {/* Arrow */}
            {!isLocked && (
              <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
            )}
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Completed result card styles ────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  } as ViewStyle,
  cardGoal: {
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,
  cardEarly: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  } as ViewStyle,

  // Banner strip
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  shareBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  bannerGoal: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  bannerEarly: {
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  bannerText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  bannerTextGoal: {
    color: '#fff',
  } as TextStyle,
  bannerTextEarly: {
    color: colors.primaryDark,
  } as TextStyle,

  // Header row inside the card body
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  typeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  } as TextStyle,
  dateText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,

  missionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  } as TextStyle,

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  } as ViewStyle,
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,
  chipValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.3,
  } as TextStyle,
  chipLabel: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,

  // XP footer
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  } as ViewStyle,
  xpText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.yellow,
  } as TextStyle,
  streakPill: {
    backgroundColor: '#FFF3E0',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  } as ViewStyle,
  streakText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.orange,
  } as TextStyle,
});

// ─── Standard node styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  nodeWrapper: {
    position: 'relative',
  } as ViewStyle,
  connector: {
    position: 'absolute',
    left: 31,
    top: 72,
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    zIndex: 0,
  } as ViewStyle,
  connectorDone: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  touchable: {
    zIndex: 1,
  } as ViewStyle,
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  nodeActive: {
    borderWidth: 2,
  } as ViewStyle,
  nodeLocked: {
    opacity: 0.55,
    borderColor: colors.border,
  } as ViewStyle,
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  content: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  typePill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  typeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  } as TextStyle,
  dateLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  missionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  missionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  } as ViewStyle,
  statText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  } as TextStyle,
  textLocked: {
    color: colors.textTertiary,
  } as TextStyle,
});
