import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import type { Mission, CompletedRun } from '../../types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  missionConfig,
  shadows,
} from '../../constants/theme';
import { XPBadge } from '../ui/XPBadge';
import { formatDistance, formatDuration } from '../../utils/xpCalculator';
import { stripEmojis } from '../../utils/stripEmojis';
import { useUserStore } from '../../store/userStore';
import { getStreakDayIndex0 } from '../../utils/streakDisplay';
import { resolveOutcome } from '../../utils/runOutcome';
import {
  formatMissionTargetDistance,
  formatPace,
} from '../../utils/missionTargetPace';
import { darkenHex } from '../../utils/hexColor';

/** Run/cycle mission target icons — sized to sit centered against distance + time lines. */
const MISSION_TARGET_ICON_SIZE = 28;

function safeLevelAccent(hex: string): string {
  return hex.length === 7 ? hex : '#9A968E';
}

/** Completed mission row ↔ full card: spring layout + directional fades. */
const missionExpandLayout = LinearTransition.springify()
  .damping(17)
  .stiffness(210)
  .mass(0.72);

const collapsedMissionEntering = FadeInUp.springify().damping(17).stiffness(200);
const collapsedMissionExiting = FadeOutUp.duration(200);
const expandedMissionEntering = FadeInDown.springify().damping(16).stiffness(195);
const expandedMissionExiting = FadeOutDown.duration(220);

// ─── Completed result card ────────────────────────────────────────────────────

function CompletedResultCard({
  mission,
  run,
  onCollapse,
  onPress,
  onViewRuns,
  levelAccent,
}: {
  mission: Mission;
  run: CompletedRun;
  /** When set, shows a collapse strip at the top of the card (expanded completed mission). */
  onCollapse?: () => void;
  /** Open mission briefing / detail. */
  onPress: () => void;
  /** List all run/cycle attempts for this mission (any outcome). */
  onViewRuns: () => void;
  /** Scavenger level accent — XP line matches level palette. */
  levelAccent: string;
}) {
  const runHistory = useUserStore((s) => s.runHistory);
  const streakDayIndex = getStreakDayIndex0(run, runHistory);
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
            <MaterialIcons
              name="keyboard-arrow-up"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={rc.banner}
          onPress={onPress}
          activeOpacity={0.9}
        >
          {!isSuccess && (
            <MaterialIcons
              name={isPartial ? 'schedule' : 'close'}
              size={14}
              color={
                isPartial ? colors.orange : colors.textTertiary
              }
            />
          )}
          <Text style={[rc.bannerText, isSuccess && rc.bannerTextEmphasis]}>
            {isSuccess
              ? 'MISSION COMPLETE'
              : isPartial
                ? 'PARTIAL CREDIT'
                : 'INCOMPLETE'}
          </Text>
        </TouchableOpacity>
        <View style={rc.bannerXp}>
          <MaterialIcons name="star" size={14} color={levelAccent} />
          <Text
            style={[
              rc.bannerXpText,
              { color: darkenHex(levelAccent, 0.62) },
            ]}
          >
            +{run.xpEarned} XP
          </Text>
        </View>
      </View>

      <View style={rc.bodyWrap}>
        <TouchableOpacity style={rc.body} onPress={onPress} activeOpacity={0.9}>
          <View style={rc.bodyTopRow}>
            <View style={rc.bodyTopLeft}>
              <Text style={rc.missionTitle}>{stripEmojis(mission.title)}</Text>
            </View>
            <View style={rc.bodyTopRight}>
              <View style={rc.streakPill}>
                <MaterialIcons
                  name="local-fire-department"
                  size={11}
                  color={colors.textPrimary}
                />
                <Text style={rc.streakText}>DAY {streakDayIndex}</Text>
              </View>
            </View>
          </View>

          <View style={rc.statsGrid}>
            <StatChip
              icon="straighten"
              value={formatDistance(run.distanceKm)}
              label="Distance"
              color={colors.textPrimary}
            />
            <View style={rc.divider} />
            <StatChip
              icon="timer"
              value={formatDuration(run.durationMin)}
              label="Time"
              color={colors.textPrimary}
            />
            <View style={rc.divider} />
            <StatChip
              icon="speed"
              value={formatPace(run.distanceKm, run.durationMin)}
              label="Pace"
              color={colors.textPrimary}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={rc.runsLink}
          onPress={onViewRuns}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open full mission details"
        >
          <MaterialIcons
            name="insights"
            size={16}
            color={colors.textPrimary}
          />
          <Text style={rc.runsLinkText}>Activity & stats</Text>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
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
      <View
        style={[
          pb.fill,
          {
            width: `${Math.min(progress, 1) * 100}%` as any,
            backgroundColor: color,
          },
        ]}
      />
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
  /** At least one logged attempt for this mission (any outcome). */
  hasMissionAttempts: boolean;
  onPress: () => void;
  onRetry?: () => void;
  isLast?: boolean;
  levelAccent: string;
  onViewMissionRuns: () => void;
}

export function MissionNode({
  mission,
  completedRun,
  hasMissionAttempts,
  onPress,
  onRetry,
  isLast = false,
  levelAccent,
  onViewMissionRuns,
}: MissionNodeProps) {
  const config = missionConfig[mission.type];
  const accent = safeLevelAccent(levelAccent);
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
        <Animated.View
          style={styles.touchable}
          layout={missionExpandLayout}
        >
          {!completedExpanded ? (
            <Animated.View
              key="mission-collapsed"
              entering={collapsedMissionEntering}
              exiting={collapsedMissionExiting}
              style={styles.collapsedCompleted}
            >
              <TouchableOpacity
                style={styles.collapsedCompletedMain}
                onPress={() => setCompletedExpanded(true)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.collapsedTypeIcon,
                    {
                      borderColor: accent,
                      backgroundColor: `${accent}18`,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={config.icon as any}
                    size={16}
                    color={accent}
                  />
                </View>
                <View style={styles.collapsedCompletedText}>
                  <Text
                    style={styles.collapsedCompletedTitle}
                    numberOfLines={1}
                  >
                    {stripEmojis(mission.title)}
                  </Text>
                  <Text style={styles.collapsedCompletedMeta}>
                    {completedOutcomeWord} ·{' '}
                    {formatDistance(completedRun.distanceKm)}
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
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View
              key="mission-expanded"
              entering={expandedMissionEntering}
              exiting={expandedMissionExiting}
            >
              <CompletedResultCard
                mission={mission}
                run={completedRun}
                onCollapse={() => setCompletedExpanded(false)}
                onPress={onPress}
                onViewRuns={onViewMissionRuns}
                levelAccent={accent}
              />
            </Animated.View>
          )}
        </Animated.View>
      ) : isAborted ? (
        <View style={styles.touchable}>
          <View style={[styles.node, styles.nodeAborted]}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
              <View style={styles.nodeBody}>
                <View style={styles.cardTopRow}>
                  <View style={styles.nodeTitleRow}>
                    <View
                      style={[
                        styles.typeIconBlock,
                        {
                          backgroundColor: `${accent}22`,
                          borderColor: accent,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={config.icon as any}
                        size={18}
                        color={accent}
                      />
                    </View>
                    <View style={styles.nodeTitleBlock}>
                      <Text style={styles.missionTitle} numberOfLines={2}>
                        {stripEmojis(mission.title)}
                      </Text>
                    </View>
                  </View>
                  <XPBadge
                    xp={mission.xpReward}
                    size="sm"
                    accentColor={accent}
                  />
                </View>

                <View style={styles.nodeMetaRow}>
                  <View style={styles.distancePills}>
                    <View style={styles.distancePillColumnLeft}>
                      <View
                        style={[
                          styles.distancePill,
                          styles.distancePillRowWide,
                          styles.distancePillTargets,
                        ]}
                      >
                        <MaterialIcons
                          name="directions-run"
                          size={MISSION_TARGET_ICON_SIZE}
                          color={colors.textSecondary}
                        />
                        <View style={styles.journeyTargetLines}>
                          <Text style={styles.targetSummaryLine}>
                            {formatMissionTargetDistance(
                              mission.targetDistanceKm,
                            )}
                          </Text>
                          <Text style={styles.targetSummaryLine}>
                            {mission.targetDurationMin <= 0
                              ? '–'
                              : formatDuration(mission.targetDurationMin)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.distancePillColumnRight}>
                      <View
                        style={[
                          styles.distancePill,
                          styles.distancePillCycle,
                          styles.distancePillEnd,
                          styles.distancePillTargets,
                        ]}
                      >
                        <MaterialIcons
                          name="directions-bike"
                          size={MISSION_TARGET_ICON_SIZE}
                          color={colors.textSecondary}
                        />
                        <View style={styles.journeyCycleLines}>
                          <Text style={styles.targetCycleSummaryLine}>
                            {formatMissionTargetDistance(
                              mission.targetCyclingDistanceKm,
                            )}
                          </Text>
                          <Text style={styles.targetCycleSummaryLine}>
                            {mission.targetCyclingDurationMin <= 0
                              ? '–'
                              : formatDuration(
                                  mission.targetCyclingDurationMin,
                                )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {hasMissionAttempts && (
                  <TouchableOpacity
                    style={styles.missionActivityLink}
                    onPress={onViewMissionRuns}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Open full mission details"
                  >
                    <MaterialIcons
                      name="insights"
                      size={14}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.missionActivityLinkText}>
                      Activity & stats
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRetryPress}
              activeOpacity={0.85}
              style={styles.retryBtnAbortedLight}
            >
              <MaterialIcons
                name="replay"
                size={15}
                color={colors.textSecondary}
              />
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
                  <Text style={[styles.questBadgeText, styles.textLocked]}>
                    LOCKED
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.nodeBody}>
              <View style={styles.cardTopRow}>
                <View style={styles.nodeTitleRow}>
                  <View
                    style={[
                      styles.typeIconBlock,
                      isLocked
                        ? {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                          }
                        : {
                            backgroundColor: `${accent}22`,
                            borderColor: accent,
                          },
                    ]}
                  >
                    {isLocked ? (
                      <MaterialIcons
                        name="lock"
                        size={18}
                        color={colors.textTertiary}
                      />
                    ) : (
                      <MaterialIcons
                        name={config.icon as any}
                        size={18}
                        color={accent}
                      />
                    )}
                  </View>
                  <View style={styles.nodeTitleBlock}>
                    <Text
                      style={[
                        styles.missionTitle,
                        isLocked && styles.textLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {stripEmojis(mission.title)}
                    </Text>
                  </View>
                </View>
                {!isLocked && (
                  <XPBadge
                    xp={mission.xpReward}
                    size="sm"
                    accentColor={accent}
                  />
                )}
              </View>

              <View style={styles.nodeMetaRow}>
                <View style={styles.distancePills}>
                  <View style={styles.distancePillColumnLeft}>
                    <View
                      style={[
                        styles.distancePill,
                        styles.distancePillRowWide,
                        styles.distancePillTargets,
                      ]}
                    >
                      <MaterialIcons
                        name="directions-run"
                        size={MISSION_TARGET_ICON_SIZE}
                        color={
                          isLocked ? colors.textTertiary : colors.textSecondary
                        }
                      />
                      <View style={styles.journeyTargetLines}>
                        <Text
                          style={[
                            styles.targetSummaryLine,
                            isLocked && styles.textLocked,
                          ]}
                        >
                          {formatMissionTargetDistance(
                            mission.targetDistanceKm,
                          )}
                        </Text>
                        <Text
                          style={[
                            styles.targetSummaryLine,
                            isLocked && styles.textLocked,
                          ]}
                        >
                          {mission.targetDurationMin <= 0
                            ? '–'
                            : formatDuration(mission.targetDurationMin)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.distancePillColumnRight}>
                    <View
                      style={[
                        styles.distancePill,
                        styles.distancePillCycle,
                        styles.distancePillEnd,
                        styles.distancePillTargets,
                      ]}
                    >
                      <MaterialIcons
                        name="directions-bike"
                        size={MISSION_TARGET_ICON_SIZE}
                        color={
                          isLocked ? colors.textTertiary : colors.textSecondary
                        }
                      />
                      <View style={styles.journeyCycleLines}>
                        <Text
                          style={[
                            styles.targetCycleSummaryLine,
                            isLocked && styles.textLocked,
                          ]}
                        >
                          {formatMissionTargetDistance(
                            mission.targetCyclingDistanceKm,
                          )}
                        </Text>
                        <Text
                          style={[
                            styles.targetCycleSummaryLine,
                            isLocked && styles.textLocked,
                          ]}
                        >
                          {mission.targetCyclingDurationMin <= 0
                            ? '–'
                            : formatDuration(mission.targetCyclingDurationMin)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {!isLocked && (
                <View style={styles.progressRow}>
                  <ProgressBar progress={isCompleted ? 1 : 0} color={accent} />
                </View>
              )}

              {!isLocked && hasMissionAttempts && (
                <TouchableOpacity
                  style={styles.missionActivityLink}
                  onPress={onViewMissionRuns}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open full mission details"
                >
                  <MaterialIcons
                    name="insights"
                    size={14}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.missionActivityLinkText}>
                    Activity & stats
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
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
  bannerXp: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  } as ViewStyle,
  bannerXpText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
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
  bodyWrap: {
    gap: spacing.sm,
  } as ViewStyle,
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  } as ViewStyle,
  runsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  runsLinkText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  bodyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  } as ViewStyle,
  bodyTopLeft: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  } as ViewStyle,
  bodyTopRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingTop: 1,
  } as ViewStyle,
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
    color: colors.textPrimary,
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  nodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
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

  // Meta row: targets + approximate pace
  nodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  } as ViewStyle,
  distancePills: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  } as ViewStyle,
  distancePillColumnLeft: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 2,
  } as ViewStyle,
  distancePillColumnRight: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  } as ViewStyle,
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  distancePillTargets: {
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  distancePillRowWide: {
    alignSelf: 'stretch',
    width: '100%',
  } as ViewStyle,
  /** Cycle block: hug content and sit flush to the card’s trailing edge. */
  distancePillCycle: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  } as ViewStyle,
  journeyTargetLines: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    alignItems: 'flex-start',
  } as ViewStyle,
  journeyCycleLines: {
    gap: 2,
    alignItems: 'flex-end',
    flexShrink: 1,
    minWidth: 0,
  } as ViewStyle,
  targetSummaryLine: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'left',
  } as TextStyle,
  targetCycleSummaryLine: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'right',
  } as TextStyle,
  distancePillEnd: {
    justifyContent: 'flex-end',
    width: '100%',
  } as ViewStyle,
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
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  retryBtnAbortedLightText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.4,
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
  } as ViewStyle,
  missionActivityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  missionActivityLinkText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  } as TextStyle,
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
});
