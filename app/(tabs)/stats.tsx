import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useDevStore } from '../../src/store/devStore';
import { getNow } from '../../src/utils/dateUtils';
import {
  getMonthStats,
  getMonthName,
  getRunsForMonth,
} from '../../src/utils/statsUtils';
import { formatDistance } from '../../src/utils/xpCalculator';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
  missionConfig,
} from '../../src/constants/theme';
import type {
  ActivityMode,
  CompletedRun,
  Mission,
  PersonaId,
} from '../../src/types';
import {
  findMissionById,
  resolveMissionDisplayTitle,
} from '../../src/utils/missionLookup';
import { FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import {
  isAbortedRun,
  isMissionCompletedOrPartial,
  resolveOutcome,
} from '../../src/utils/runOutcome';
import { SortieOutcomeBadge } from '../../src/components/ui/SortieOutcomeBadge';
import RunShareCard from '../../src/components/share/RunShareCard';
import { shareCard } from '../../src/services/shareService';
import ViewShot from 'react-native-view-shot';
import { getStreakDayIndex0 } from '../../src/utils/streakDisplay';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPaceMinPerKm(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01) return '–';
  const paceSecPerKm = (durationMin * 60) / distanceKm;
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function targetPaceLabel(targetKm: number, targetMin: number): string {
  if (targetKm < 0.01 || targetMin <= 0) return '–';
  return formatPaceMinPerKm(targetKm, targetMin);
}

function dayGroupLabel(iso: string): string {
  const when = new Date(iso);
  return when.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function missionForRun(
  missionId: string,
  weekMissions: Mission[],
): Mission | undefined {
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION;
  return findMissionById(weekMissions, missionId);
}

function targetsForMission(
  mission: Mission | undefined,
  activityMode: ActivityMode,
): { distKm: number; durMin: number } {
  if (!mission) return { distKm: 0, durMin: 0 };
  if (activityMode === 'cycle') {
    return {
      distKm: mission.targetCyclingDistanceKm,
      durMin: mission.targetCyclingDurationMin,
    };
  }
  return {
    distKm: mission.targetDistanceKm,
    durMin: mission.targetDurationMin,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MonthHeader({
  year,
  month,
  onPrev,
  onNext,
  isCurrentMonth,
  prevMonthHasData,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  isCurrentMonth: boolean;
  prevMonthHasData: boolean;
}) {
  const prevDisabled = !prevMonthHasData;
  return (
    <View style={styles.monthHeader}>
      <TouchableOpacity
        onPress={onPrev}
        style={[styles.navBtn, prevDisabled && styles.navBtnDisabled]}
        activeOpacity={prevDisabled ? 1 : 0.7}
        disabled={prevDisabled}
        accessibilityState={{ disabled: prevDisabled }}
      >
        <MaterialIcons
          name="chevron-left"
          size={26}
          color={prevDisabled ? colors.textTertiary : colors.textPrimary}
        />
      </TouchableOpacity>

      <View style={styles.monthTitleWrap}>
        <Text style={styles.monthTitle}>
          {getMonthName(month)} {year}
        </Text>
        {isCurrentMonth && (
          <View style={styles.currentPill}>
            <Text style={styles.currentPillText}>This month</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={onNext}
        style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
        activeOpacity={isCurrentMonth ? 1 : 0.7}
        disabled={isCurrentMonth}
      >
        <MaterialIcons
          name="chevron-right"
          size={26}
          color={isCurrentMonth ? colors.textTertiary : colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

function MonthSummaryRow({
  totalXp,
  totalMissions,
  totalDistanceKm,
  compact = false,
}: {
  totalXp: number;
  totalMissions: number;
  totalDistanceKm: number;
  compact?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, compact && styles.summaryRowCompact]}>
      <SummaryStat
        value={formatDistance(totalDistanceKm)}
        unit="total"
        icon="straighten"
        color={colors.primary}
        compact={compact}
      />
      <View style={[styles.summaryDivider, compact && styles.summaryDividerCompact]} />
      <SummaryStat
        value={`${totalMissions}`}
        unit="missions"
        icon="directions-run"
        color={colors.primary}
        compact={compact}
      />
      <View style={[styles.summaryDivider, compact && styles.summaryDividerCompact]} />
      <SummaryStat
        value={`${totalXp}`}
        unit="XP"
        icon="star"
        color={colors.purple}
        compact={compact}
      />
    </View>
  );
}

function SummaryStat({
  value,
  unit,
  icon,
  color,
  compact = false,
}: {
  value: string;
  unit: string;
  icon: string;
  color: string;
  compact?: boolean;
}) {
  const iconSize = compact ? 15 : 18;
  return (
    <View style={[styles.summaryStat, compact && styles.summaryStatCompact]}>
      <MaterialIcons name={icon as any} size={iconSize} color={color} />
      <Text
        style={[
          styles.summaryValue,
          compact && styles.summaryValueCompact,
          { color },
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.summaryUnit, compact && styles.summaryUnitCompact]}>
        {unit}
      </Text>
    </View>
  );
}

function MonthRunRow({
  run,
  mission,
  personaId,
  defaultActivityMode,
  onPress,
  canShare,
  onSharePress,
}: {
  run: CompletedRun;
  mission: Mission | undefined;
  personaId: PersonaId | null | undefined;
  defaultActivityMode: ActivityMode;
  onPress: () => void;
  canShare: boolean;
  onSharePress: () => void;
}) {
  const title = resolveMissionDisplayTitle(
    run.missionId,
    mission,
    personaId,
  );
  const mode = run.activityMode ?? defaultActivityMode;
  const { distKm: targetKm, durMin: targetMin } = targetsForMission(
    mission,
    mode,
  );
  const when = new Date(run.completedAt);
  const timeStr = when.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const outcome = resolveOutcome(run);
  const mType = mission?.type ?? 'easy';
  const config = missionConfig[mType];
  const modeLabel = mode === 'cycle' ? 'Cycle' : 'Run';

  return (
    <TouchableOpacity
      style={styles.runRow}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.runRowTop}>
        <View style={styles.runRowTitleWrap}>
          <View style={[styles.typePill, { backgroundColor: config.bgColor }]}>
            <MaterialIcons
              name={config.icon as any}
              size={12}
              color={config.color}
            />
            <Text style={[styles.typePillText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.runRowTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.runRowRight}>
          <SortieOutcomeBadge outcome={outcome} />
        </View>
      </View>
      <Text style={styles.runRowDate}>
        {timeStr} · {modeLabel}
      </Text>

      <View style={styles.runRowMetrics}>
        <Text style={styles.runRowMetricLabel}>Target</Text>
        <Text style={styles.runRowMetricValue}>
          {formatDistance(targetKm)} ·{' '}
          {targetMin > 0 ? `${Math.round(targetMin)} min` : '–'} ·{' '}
          {targetPaceLabel(targetKm, targetMin)}
        </Text>
      </View>
      <View style={styles.runRowMetrics}>
        <Text style={styles.runRowMetricLabel}>Actual</Text>
        <Text style={styles.runRowMetricValueActual}>
          {formatDistance(run.distanceKm)} · {Math.round(run.durationMin)} min ·{' '}
          {formatPaceMinPerKm(run.distanceKm, run.durationMin)}
        </Text>
      </View>
      <View style={styles.runRowBottom}>
        {canShare ? (
          <TouchableOpacity
            onPress={onSharePress}
            style={styles.runRowShareBtn}
            hitSlop={12}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share this mission"
          >
            <MaterialIcons name="ios-share" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.runRowBottomSpacer} />
        <Text style={styles.runRowXpInline}>+{run.xpEarned} XP</Text>
        <MaterialIcons
          name="chevron-right"
          size={18}
          color={colors.textTertiary}
          style={styles.runRowChevron}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const dayOffset = useDevStore((s) => s.dayOffset);
  const now = getNow();
  void dayOffset;

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  /** When false, missions list omits aborted attempts; tap to reveal. */
  const [showAbortedInMonthList, setShowAbortedInMonthList] = useState(false);

  const runHistory = useUserStore((s) => s.runHistory);
  const profilePersona = useUserStore((s) => s.profile?.personaId ?? s.personaId);
  const defaultActivityMode = useUserStore(
    (s) => s.profile?.defaultActivityMode ?? 'run',
  );
  const weekMissions = useMissionsStore((s) => s.weekMissions);

  const runShareRef = useRef<ViewShot>(null);
  const [sharingRun, setSharingRun] = useState<CompletedRun | null>(null);

  useEffect(() => {
    const n = getNow();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
  }, [dayOffset]);

  useEffect(() => {
    setShowAbortedInMonthList(false);
  }, [year, month]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const prevMonthHasData = useMemo(() => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    return getRunsForMonth(runHistory, prevYear, prevMonth).length > 0;
  }, [runHistory, year, month]);

  const handlePrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (isCurrentMonth) return;
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthStats = useMemo(
    () => getMonthStats(runHistory, year, month),
    [runHistory, year, month],
  );

  const runsMonth = useMemo(() => {
    const list = getRunsForMonth(runHistory, year, month);
    return [...list].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [runHistory, year, month]);

  const abortedCountThisMonth = useMemo(
    () => runsMonth.filter(isAbortedRun).length,
    [runsMonth],
  );

  const visibleRunsMonth = useMemo(
    () =>
      showAbortedInMonthList
        ? runsMonth
        : runsMonth.filter((r) => !isAbortedRun(r)),
    [runsMonth, showAbortedInMonthList],
  );

  const visibleRunsByDay = useMemo(() => {
    const groups = new Map<string, CompletedRun[]>();
    for (const run of visibleRunsMonth) {
      const key = run.completedAt.slice(0, 10);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(run);
      } else {
        groups.set(key, [run]);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dayKey, dayRuns]) => {
        const sorted = [...dayRuns].sort((x, y) =>
          y.completedAt.localeCompare(x.completedAt),
        );
        return [dayKey, sorted] as [string, CompletedRun[]];
      });
  }, [visibleRunsMonth]);

  const openRunDetail = useCallback((run: CompletedRun) => {
    router.push({
      pathname: '/run/history',
      params: {
        missionId: run.missionId,
        completedAt: encodeURIComponent(run.completedAt),
      },
    });
  }, []);

  const handleShareRun = useCallback(async (run: CompletedRun) => {
    setSharingRun(run);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const hasPath = run.path && run.path.length >= 2;
      await shareCard(runShareRef, { delayMs: hasPath ? 550 : 100 });
    } finally {
      setSharingRun(null);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(300)} style={styles.titleRow}>
          <Text style={styles.screenTitle}>Monthly Stats</Text>
        </Animated.View>

        {/* Monthly summary */}
        <Animated.View
          entering={FadeInDown.delay(30).duration(300)}
          style={[styles.card, styles.monthCardCompact]}
        >
          {runsMonth.length > 0 ? (
            <MonthSummaryRow
              compact
              totalXp={monthStats.totalXp}
              totalMissions={monthStats.totalMissions}
              totalDistanceKm={monthStats.totalDistanceKm}
            />
          ) : (
            <Text style={styles.emptyText}>
              No activity recorded for this month yet.
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <MonthHeader
            year={year}
            month={month}
            onPrev={handlePrev}
            onNext={handleNext}
            isCurrentMonth={isCurrentMonth}
            prevMonthHasData={prevMonthHasData}
          />
        </Animated.View>

        {/* Mission list — no outer card (day groups + mission cards carry borders) */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={styles.missionsSection}
        >
          {runsMonth.length === 0 ? (
            <Text style={styles.emptyText}>
              No recorded runs or cycles in {getMonthName(month)} {year}.
            </Text>
          ) : (
            <>
              {visibleRunsMonth.length === 0 ? (
                <Text style={styles.emptyText}>
                  Aborted missions are hidden by default. Tap below to show them.
                </Text>
              ) : (
                <View style={styles.runList}>
                  {visibleRunsByDay.map(([dayKey, dayRuns]) => (
                    <View key={dayKey} style={styles.dayGroup}>
                      <Text style={styles.dayGroupTitle}>
                        {dayGroupLabel(dayRuns[0]!.completedAt)}
                      </Text>
                      <View style={styles.dayGroupRuns}>
                        {dayRuns.map((run) => (
                          <MonthRunRow
                            key={`${run.missionId}-${run.completedAt}`}
                            run={run}
                            mission={missionForRun(run.missionId, weekMissions)}
                            personaId={profilePersona}
                            defaultActivityMode={defaultActivityMode}
                            onPress={() => openRunDetail(run)}
                            canShare={isMissionCompletedOrPartial(run)}
                            onSharePress={() => handleShareRun(run)}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {abortedCountThisMonth > 0 && (
                <TouchableOpacity
                  style={styles.abortedToggleRow}
                  onPress={() => setShowAbortedInMonthList((v) => !v)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAbortedInMonthList
                      ? 'Hide aborted missions'
                      : `Show ${abortedCountThisMonth} aborted missions`
                  }
                >
                  <MaterialIcons
                    name={showAbortedInMonthList ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.abortedToggleText}>
                    {showAbortedInMonthList
                      ? 'Hide aborted missions'
                      : `Show ${abortedCountThisMonth} aborted`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>

      </ScrollView>

      {sharingRun && (
        <View style={styles.offscreen} pointerEvents="none">
          <RunShareCard
            ref={runShareRef}
            distanceKm={sharingRun.distanceKm}
            durationMin={sharingRun.durationMin}
            xpEarned={sharingRun.xpEarned}
            streakDay={getStreakDayIndex0(sharingRun, runHistory)}
            missionType={
              missionForRun(sharingRun.missionId, weekMissions)?.type ?? 'easy'
            }
            path={sharingRun.path}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  } as ViewStyle,

  titleRow: {
    paddingBottom: spacing.xs,
  } as ViewStyle,
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  } as ViewStyle,
  navBtnDisabled: {
    opacity: 0.3,
  } as ViewStyle,
  monthTitleWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  monthTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  currentPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  currentPillText: {
    fontSize: fontSizes.xs,
    color: colors.primaryDark,
    fontWeight: fontWeights.semibold,
  } as TextStyle,

  missionsSection: {
    gap: spacing.md,
  } as ViewStyle,
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  } as ViewStyle,

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  monthCardCompact: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 0,
  } as ViewStyle,

  runList: {
    gap: spacing.md,
  } as ViewStyle,
  runRow: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  } as ViewStyle,
  runRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  runRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  } as ViewStyle,
  runRowTitleWrap: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  } as ViewStyle,
  typePillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  runRowTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  runRowDate: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  runRowMetrics: {
    gap: 2,
  } as ViewStyle,
  runRowMetricLabel: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  runRowMetricValue: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  } as TextStyle,
  runRowMetricValueActual: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    lineHeight: 24,
  } as TextStyle,
  runRowXpInline: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.purple,
  } as TextStyle,
  runRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  runRowShareBtn: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  } as ViewStyle,
  runRowBottomSpacer: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  runRowChevron: {
    marginTop: 1,
  } as ViewStyle,
  dayGroup: {
    gap: spacing.sm,
  } as ViewStyle,
  dayGroupTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  dayGroupRuns: {
    gap: spacing.md,
  } as ViewStyle,

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  } as ViewStyle,
  summaryRowCompact: {
    paddingVertical: 0,
    justifyContent: 'space-between',
  } as ViewStyle,
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  summaryStatCompact: {
    gap: 2,
  } as ViewStyle,
  summaryValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  summaryValueCompact: {
    fontSize: fontSizes.lg,
  } as TextStyle,
  summaryUnit: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  summaryUnitCompact: {
    fontSize: 9,
  } as TextStyle,
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  } as ViewStyle,
  summaryDividerCompact: {
    height: 36,
    alignSelf: 'center',
  } as ViewStyle,

  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    paddingVertical: spacing.sm,
  } as TextStyle,

  abortedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  } as ViewStyle,
  abortedToggleText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  } as TextStyle,
});
