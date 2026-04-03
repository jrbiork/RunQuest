import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Mission, CompletedRun } from '../../types';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDistance } from '../../utils/xpCalculator';
import { stripEmojis } from '../../utils/stripEmojis';
import { useUserStore } from '../../store/userStore';
import { getStreakDayIndex0 } from '../../utils/streakDisplay';

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
}: {
  mission: Mission;
  run: CompletedRun;
  onShare: () => void;
}) {
  const runHistory = useUserStore((s) => s.runHistory);
  const streakDayIndex = getStreakDayIndex0(run, runHistory);
  const config = missionConfig[mission.type];
  const goalMet = run.goalMet;

  return (
    <View style={[rc.card, rc.cardGoal]}>
      {/* Status banner + share button */}
      <View style={rc.bannerRow}>
        <View style={[rc.banner, rc.bannerGoal]}>
          <MaterialIcons
            name={goalMet ? 'emoji-events' : 'check-circle'}
            size={14}
            color={colors.textInverse}
          />
          <Text style={[rc.bannerText, rc.bannerTextGoal]}>
            {goalMet ? 'MISSION COMPLETE' : 'FINISHED EARLY'}
          </Text>
        </View>
        <TouchableOpacity onPress={onShare} style={rc.shareBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="ios-share" size={16} color={colors.orange} />
        </TouchableOpacity>
      </View>

      <View style={rc.body}>
        {/* Mission type + date */}
        <View style={rc.headerRow}>
          <View style={[rc.typePill, { borderColor: config.color }]}>
            <MaterialIcons name={config.icon as any} size={11} color={config.color} />
            <Text style={[rc.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Text style={rc.missionTitle}>{stripEmojis(mission.title)}</Text>

        {/* Actual stats grid */}
        <View style={rc.statsGrid}>
          <StatChip icon="straighten" value={formatDistance(run.distanceKm)} label="Distance" color={colors.blue} />
          <View style={rc.divider} />
          <StatChip icon="timer" value={formatDuration(run.durationMin)} label="Time" color={colors.orange} />
          <View style={rc.divider} />
          <StatChip icon="speed" value={formatPace(run.distanceKm, run.durationMin)} label="Pace" color={colors.ochre} />
        </View>

        {/* XP footer */}
        <View style={rc.xpRow}>
          <MaterialIcons name="star" size={13} color={colors.yellow} />
          <Text style={rc.xpText}>+{run.xpEarned} XP</Text>
          <View style={rc.streakPill}>
            <MaterialIcons name="local-fire-department" size={11} color={colors.orange} />
            <Text style={rc.streakText}>DAY {streakDayIndex}</Text>
          </View>
        </View>
      </View>
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
  const isFailed = mission.status === 'failed';
  const isAborted = mission.status === 'aborted';
  const needsRetry = isFailed || isAborted;

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
            isFailed && styles.connectorFailed,
          ]}
        />
      )}

      {/* Completed — rich result card */}
      {isCompleted && completedRun ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.touchable}>
          <CompletedResultCard mission={mission} run={completedRun} onShare={onShare ?? (() => {})} />
        </TouchableOpacity>
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
                    <Text style={styles.missionSubtitle} numberOfLines={1}>
                      {stripEmojis(mission.subtitle)}
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
              <MaterialIcons name="replay" size={18} color={colors.red} />
              <Text style={styles.retryBtnAbortedLightText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Active / upcoming / locked / failed — quest card */
        <TouchableOpacity
          onPress={needsRetry ? handleRetryPress : onPress}
          disabled={isLocked}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          <View style={[styles.node, isLocked && styles.nodeLocked, isFailed && styles.nodeFailed]}>
            {(isLocked || isFailed) && (
              <View style={[styles.nodeTopRow, isFailed && styles.nodeTopRowFailed]}>
                {isLocked && (
                  <View style={styles.questBadgeLocked}>
                    <Text style={[styles.questBadgeText, styles.textLocked]}>LOCKED</Text>
                  </View>
                )}
                {isFailed && (
                  <View style={styles.failBadge}>
                    <MaterialIcons name="close" size={10} color={colors.textInverse} />
                    <Text style={styles.failBadgeText}>FAILED</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.nodeBody}>
              <View style={styles.nodeTitleRow}>
                <View
                  style={[
                    styles.typeIconBlock,
                    {
                      backgroundColor: isLocked ? colors.border : isFailed ? colors.redLight : config.bgColor,
                      borderColor: isLocked ? colors.border : isFailed ? colors.red : config.color,
                    },
                  ]}
                >
                  {isLocked ? (
                    <MaterialIcons name="lock" size={18} color={colors.textTertiary} />
                  ) : isFailed ? (
                    <MaterialIcons name="close" size={18} color={colors.red} />
                  ) : (
                    <MaterialIcons name={config.icon as any} size={18} color={config.color} />
                  )}
                </View>
                <View style={styles.nodeTitleBlock}>
                  <Text
                    style={[styles.missionTitle, isLocked && styles.textLocked, isFailed && styles.textFailed]}
                    numberOfLines={2}
                  >
                    {stripEmojis(mission.title)}
                  </Text>
                  <Text
                    style={[styles.missionSubtitle, isLocked && styles.textLocked, isFailed && styles.textFailed]}
                    numberOfLines={1}
                  >
                    {stripEmojis(mission.subtitle)}
                  </Text>
                </View>
              </View>

              <View style={styles.nodeMetaRow}>
                <View style={styles.distancePills}>
                  <View style={styles.distancePill}>
                    <MaterialIcons
                      name="directions-run"
                      size={12}
                      color={isLocked ? colors.textTertiary : isFailed ? colors.red : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        isLocked && styles.textLocked,
                        isFailed && styles.textFailed,
                      ]}
                    >
                      {formatDistance(mission.targetDistanceKm)}
                    </Text>
                    <Text style={[styles.durationText, isLocked && styles.textLocked]}>
                      ~{formatDuration(mission.targetDurationMin)}
                    </Text>
                  </View>
                  <View style={styles.distancePill}>
                    <MaterialIcons
                      name="directions-bike"
                      size={12}
                      color={isLocked ? colors.textTertiary : isFailed ? colors.red : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        isLocked && styles.textLocked,
                        isFailed && styles.textFailed,
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
                  <ProgressBar progress={isCompleted ? 1 : 0} color={isFailed ? colors.red : config.color} />
                </View>
              )}
            </View>

            {isFailed && (
              <View style={[styles.retryBtn, styles.retryBtnFailed]}>
                <MaterialIcons name="replay" size={16} color={colors.textInverse} />
                <Text style={styles.retryBtnText}>MISSION FAILED — RETRY</Text>
              </View>
            )}
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
    ...shadows.md,
  } as ViewStyle,
  cardGoal: {
    backgroundColor: 'rgba(103,144,88,0.08)',
    borderColor: colors.primary,
  } as ViewStyle,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  shareBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  bannerGoal: { backgroundColor: colors.primary } as ViewStyle,
  bannerText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  bannerTextGoal: { color: colors.textInverse } as TextStyle,
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
  } as ViewStyle,
  typeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: colors.yellow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.orangeLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.orange,
  } as ViewStyle,
  streakText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.orange,
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
    backgroundColor: colors.primary,
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
    borderWidth: 2,
    borderColor: colors.red,
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
    borderColor: colors.red,
    backgroundColor: 'rgba(217,69,60,0.08)',
  } as ViewStyle,
  abortedTagText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.red,
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
  missionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
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
    gap: spacing.md,
  } as ViewStyle,
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
    backgroundColor: colors.red,
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
    color: colors.red,
    letterSpacing: 0.5,
  } as TextStyle,
  retryBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,
});
