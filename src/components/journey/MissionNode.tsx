import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Mission, CompletedRun } from '../../types';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDistance } from '../../utils/xpCalculator';
import { stripEmojis } from '../../utils/stripEmojis';
import { useUserStore } from '../../store/userStore';
import { getStreakDayIndex0 } from '../../utils/streakDisplay';
import { resolveOutcome } from '../../utils/runOutcome';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

function formatPace(distKm: number, durMin: number): string {
  if (distKm < 0.01) return '–';
  const secPerKm = (durMin * 60) / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

// ─── Completed result card ────────────────────────────────────────────────────

function CompletedResultCard({
  mission,
  run,
  onShare,
  onCollapse,
  onPress,
}: {
  mission: Mission;
  run: CompletedRun;
  onShare: () => void;
  /** When set, shows a collapse strip at the top of the card (expanded completed mission). */
  onCollapse?: () => void;
  /** Open mission briefing / detail. */
  onPress: () => void;
}) {
  const runHistory = useUserStore((s) => s.runHistory);
  const streakDayIndex = getStreakDayIndex0(run, runHistory);
  const config = missionConfig[mission.type];
  const outcome = resolveOutcome(run);
  const isSuccess = outcome === 'success';
  const isPartial = outcome === 'partial_time';

  return (
    <View style={[rc.card, rc.cardNeutral]}>
      {/* Status row: collapse arrow + label + share — single bar inside the card */}
      <View style={rc.bannerRow}>
        {onCollapse != null && (
          <TouchableOpacity
            style={rc.bannerCollapseBtn}
            onPress={onCollapse}
            activeOpacity={0.7}
            accessibilityLabel="Collapse"
            accessibilityRole="button"
          >
            <MaterialIcons name="keyboard-arrow-up" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={rc.banner}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <MaterialIcons
            name={isSuccess ? 'emoji-events' : isPartial ? 'schedule' : 'close'}
            size={14}
            color={isSuccess ? colors.primary : colors.textTertiary}
          />
          <Text
            style={[
              rc.bannerText,
              isSuccess && rc.bannerTextEmphasis,
            ]}
          >
            {isSuccess ? 'MISSION COMPLETE' : isPartial ? 'PARTIAL CREDIT' : 'INCOMPLETE'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={rc.shareBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons
            name="ios-share"
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={rc.body} onPress={onPress} activeOpacity={0.9}>
        {/* Mission type + date */}
        <View style={rc.headerRow}>
          <View style={rc.typePill}>
            <MaterialIcons name={config.icon as any} size={11} color={colors.textSecondary} />
            <Text style={rc.typeText}>{config.label}</Text>
          </View>
        </View>

        <Text style={rc.missionTitle}>{stripEmojis(mission.title)}</Text>

        {/* Actual stats grid */}
        <View style={rc.statsGrid}>
          <StatChip icon="straighten" value={formatDistance(run.distanceKm)} label="Distance" color={colors.textPrimary} />
          <View style={rc.divider} />
          <StatChip icon="timer" value={formatDuration(run.durationMin)} label="Time" color={colors.textPrimary} />
          <View style={rc.divider} />
          <StatChip icon="speed" value={formatPace(run.distanceKm, run.durationMin)} label="Pace" color={colors.textPrimary} />
        </View>

        {/* XP footer */}
        <View style={rc.xpRow}>
          <MaterialIcons name="star" size={13} color={colors.textTertiary} />
          <Text style={rc.xpText}>+{run.xpEarned} XP</Text>
          <View style={rc.streakPill}>
            <MaterialIcons name="local-fire-department" size={11} color={colors.textTertiary} />
            <Text style={rc.streakText}>DAY {streakDayIndex}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function StatChip({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={rc.chip}>
      <MaterialIcons name={icon as any} size={13} color={color} />
      <Text style={[rc.chipValue, { color }]}>{value}</Text>
      <Text style={rc.chipLabel}>{label}</Text>
    </View>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.min(progress, 1) * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    flex: 1,
  } as ViewStyle,
  fill: {
    height: '100%',
    borderRadius: 2,
  } as ViewStyle,
});

// ─── Main MissionNode ────────────────────────────────────────────────────────

interface MissionNodeProps {
  mission: Mission;
  completedRun?: CompletedRun;
  onPress: () => void;
  onShare?: () => void;
  onRetry?: () => void;
  isLast?: boolean;
}

export function MissionNode({ mission, completedRun, onPress, onShare, onRetry, isLast = false }: MissionNodeProps) {
  const config = missionConfig[mission.type];
  const isCompleted = mission.status === 'completed';
  const isLocked = mission.status === 'locked';
  const isAborted = mission.status === 'aborted';
  const needsRetry = isAborted;
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const completedOutcome =
    isCompleted && completedRun ? resolveOutcome(completedRun) : null;
  const completedOutcomeWord =
    completedOutcome === 'success'
      ? 'Complete'
      : completedOutcome === 'partial_time'
        ? 'Partial'
        : completedOutcome
          ? 'Incomplete'
          : '';

  const handleRetryPress = () => {
    onRetry?.();
    onPress();
  };

  return (
    <View style={styles.nodeWrapper}>
      {/* Connector line between nodes */}
      {!isLast && (
        <View
          style={[
            styles.connector,
            isCompleted && styles.connectorDone,
            isAborted && styles.connectorFailed,
          ]}
        />
      )}

      {/* Completed — collapsed summary by default; expand for full card */}
      {isCompleted && completedRun ? (
        <View style={styles.touchable}>
          {!completedExpanded ? (
            <View style={styles.collapsedCompleted}>
              <TouchableOpacity
                style={styles.collapsedCompletedMain}
                onPress={() => setCompletedExpanded(true)}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedTypeIcon}>
                  <MaterialIcons name={config.icon as any} size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.collapsedCompletedText}>
                  <Text style={styles.collapsedCompletedTitle} numberOfLines={1}>
                    {stripEmojis(mission.title)}
                  </Text>
                  <Text style={styles.collapsedCompletedMeta}>
                    {completedOutcomeWord} · {formatDistance(completedRun.distanceKm)}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.collapsedExpandArrow}
                onPress={() => setCompletedExpanded(true)}
                activeOpacity={0.75}
                accessibilityLabel="Expand mission details"
                accessibilityRole="button"
              >
                <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onShare?.()}
                style={styles.collapsedShareBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name="ios-share"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <CompletedResultCard
              mission={mission}
              run={completedRun}
              onShare={onShare ?? (() => {})}
              onCollapse={() => setCompletedExpanded(false)}
              onPress={onPress}
            />
          )}
        </View>
      ) : isAborted ? (
        <View style={styles.touchable}>
          <View style={[styles.node, styles.nodeAborted]}>
            <View style={styles.abortedTagCorner} pointerEvents="none">
              <View style={styles.abortedTag}>
                <Text style={styles.abortedTagText}>ABORTED</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
              <View style={styles.nodeBody}>
                <View style={styles.nodeTitleRow}>
                  <View
                    style={[
                      styles.typeIconBlock,
                      { backgroundColor: config.bgColor, borderColor: config.color },
                    ]}
                  >
                    <MaterialIcons name={config.icon as any} size={18} color={config.color} />
                  </View>
                  <View style={styles.nodeTitleBlock}>
                    <View style={styles.typeTagRow}>
                      <View style={[styles.missionTypePill, { borderColor: config.color }]}>
                        <MaterialIcons name={config.icon as any} size={10} color={config.color} />
                        <Text style={[styles.missionTypePillText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.missionTitle} numberOfLines={2}>
                      {stripEmojis(mission.title)}
                    </Text>
                  </View>
                </View>

                <View style={styles.nodeMetaRow}>
                  <View style={styles.distancePills}>
                    <View style={styles.distancePill}>
                      <MaterialIcons name="directions-run" size={12} color={colors.textSecondary} />
                      <Text style={styles.distanceText}>{formatDistance(mission.targetDistanceKm)}</Text>
                      <Text style={styles.durationText}>~{formatDuration(mission.targetDurationMin)}</Text>
                    </View>
                    <Text style={styles.metaPipe}>|</Text>
                    <View style={styles.distancePill}>
                      <MaterialIcons name="directions-bike" size={12} color={colors.textSecondary} />
                      <Text style={styles.distanceText}>{formatDistance(mission.targetCyclingDistanceKm)}</Text>
                      <Text style={styles.durationText}>~{formatDuration(mission.targetCyclingDurationMin)}</Text>
                    </View>
                  </View>
                  <XPBadge xp={mission.xpReward} size="sm" />
                </View>

                <View style={styles.progressRow}>
                  <ProgressBar progress={0} color={config.color} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRetryPress}
              activeOpacity={0.85}
              style={styles.retryBtnAbortedLight}
            >
              <MaterialIcons name="replay" size={18} color={colors.textSecondary} />
              <Text style={styles.retryBtnAbortedLightText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Active / upcoming / locked — quest card */
        <TouchableOpacity
          onPress={needsRetry ? handleRetryPress : onPress}
          disabled={isLocked}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          <View style={[styles.node, isLocked && styles.nodeLocked]}>
            {isLocked && (
              <View style={styles.nodeTopRow}>
                <View style={styles.questBadgeLocked}>
                  <Text style={[styles.questBadgeText, styles.textLocked]}>LOCKED</Text>
                </View>
              </View>
            )}

            <View style={styles.nodeBody}>
              <View style={styles.nodeTitleRow}>
                <View
                  style={[
                    styles.typeIconBlock,
                    {
                      backgroundColor: isLocked ? colors.border : config.bgColor,
                      borderColor: isLocked ? colors.border : config.color,
                    },
                  ]}
                >
                  {isLocked ? (
                    <MaterialIcons name="lock" size={18} color={colors.textTertiary} />
                  ) : (
                    <MaterialIcons name={config.icon as any} size={18} color={config.color} />
                  )}
                </View>
                <View style={styles.nodeTitleBlock}>
                  <Text
                    style={[styles.missionTitle, isLocked && styles.textLocked]}
                    numberOfLines={2}
                  >
                    {stripEmojis(mission.title)}
                  </Text>
                </View>
              </View>

              <View style={styles.nodeMetaRow}>
                <View style={styles.distancePills}>
                  <View style={styles.distancePill}>
                    <MaterialIcons
                      name="directions-run"
                      size={12}
                      color={isLocked ? colors.textTertiary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        isLocked && styles.textLocked,
                      ]}
                    >
                      {formatDistance(mission.targetDistanceKm)}
                    </Text>
                    <Text style={[styles.durationText, isLocked && styles.textLocked]}>
                      ~{formatDuration(mission.targetDurationMin)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.metaPipe,
                      isLocked && styles.metaPipeLocked,
                    ]}
                  >
                    |
                  </Text>
                  <View style={styles.distancePill}>
                    <MaterialIcons
                      name="directions-bike"
                      size={12}
                      color={isLocked ? colors.textTertiary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        isLocked && styles.textLocked,
                      ]}
                    >
                      {formatDistance(mission.targetCyclingDistanceKm)}
                    </Text>
                    <Text style={[styles.durationText, isLocked && styles.textLocked]}>
                      ~{formatDuration(mission.targetCyclingDurationMin)}
                    </Text>
                  </View>
                </View>
                {!isLocked && <XPBadge xp={mission.xpReward} size="sm" />}
              </View>

              {!isLocked && (
                <View style={styles.progressRow}>
                  <ProgressBar progress={isCompleted ? 1 : 0} color={config.color} />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Completed result card styles ─────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  } as ViewStyle,
  bannerCollapseBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  } as ViewStyle,
  cardNeutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  } as ViewStyle,
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  } as ViewStyle,
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 0,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  shareBtn: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  } as ViewStyle,
  bannerText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  } as TextStyle,
  bannerTextEmphasis: {
    color: colors.textPrimary,
  } as TextStyle,
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  typeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  } as TextStyle,
  missionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  } as ViewStyle,
  divider: {
    width: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  } as ViewStyle,
  chipValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  chipLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  } as TextStyle,
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  xpText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'transparent',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  streakText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
});

// ─── Standard node styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  nodeWrapper: {
    position: 'relative',
  } as ViewStyle,
  connector: {
    position: 'absolute',
    left: '50%',
    top: '100%',
    width: 2,
    height: spacing.xxl,
    backgroundColor: colors.border,
    zIndex: 0,
    borderStyle: 'dashed',
  } as ViewStyle,
  connectorDone: {
    backgroundColor: 'rgba(103,144,88,0.35)',
  } as ViewStyle,
  touchable: {
    zIndex: 1,
  } as ViewStyle,
  node: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  } as ViewStyle,
  abortedTagCorner: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 4,
  } as ViewStyle,
  nodeLocked: {
    opacity: 0.45,
  } as ViewStyle,
  nodeFailed: {
    borderWidth: 2,
    borderColor: colors.red,
    backgroundColor: 'rgba(217,69,60,0.04)',
  } as ViewStyle,
  nodeAborted: {
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,

  // Top row: status badges
  nodeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  nodeTopRowFailed: {
    borderBottomColor: colors.red,
    backgroundColor: colors.redLight,
  } as ViewStyle,
  failBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.red,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  } as ViewStyle,
  failBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  questBadge: {
    backgroundColor: colors.orangeLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.orange,
  } as ViewStyle,
  questBadgeLocked: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  } as ViewStyle,
  questBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  // Body
  nodeBody: {
    padding: spacing.md,
    gap: spacing.sm,
  } as ViewStyle,
  nodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  } as ViewStyle,
  typeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginBottom: 4,
    alignSelf: 'flex-start',
  } as ViewStyle,
  missionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.surface,
  } as ViewStyle,
  missionTypePillText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  abortedTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  abortedTagText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  typeIconBlock: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  nodeTitleBlock: {
    flex: 1,
    gap: 3,
  } as ViewStyle,
  missionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 20,
  } as TextStyle,

  // Meta row: distance + XP
  nodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  distancePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  } as ViewStyle,
  metaPipe: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    paddingHorizontal: 2,
  } as TextStyle,
  metaPipeLocked: {
    color: colors.textTertiary,
    opacity: 0.7,
  } as TextStyle,
  metaPipeFailed: {
    color: colors.red,
    opacity: 0.85,
  } as TextStyle,
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  distanceText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  durationText: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  progressRow: {
    marginTop: 2,
  } as ViewStyle,

  textLocked: {
    color: colors.textTertiary,
  } as TextStyle,
  textFailed: {
    color: colors.red,
  } as TextStyle,

  // Connector
  connectorFailed: {
    backgroundColor: colors.textTertiary,
  } as ViewStyle,

  // RETRY button
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  } as ViewStyle,
  retryBtnFailed: {
    backgroundColor: colors.red,
    borderTopColor: 'rgba(217,69,60,0.6)',
  } as ViewStyle,
  retryBtnAbortedLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  retryBtnAbortedLightText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  } as TextStyle,
  retryBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  collapsedCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  } as ViewStyle,
  collapsedCompletedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    minWidth: 0,
  } as ViewStyle,
  collapsedTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  collapsedExpandArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  } as ViewStyle,
  collapsedCompletedText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  } as ViewStyle,
  collapsedCompletedTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  collapsedCompletedMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
  collapsedShareBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  } as ViewStyle,
});
