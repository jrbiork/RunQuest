import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useUserStore, selectWeeklyRunsTarget } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useDevStore } from '../../src/store/devStore';
import { getNow, getWeekStart, getWeekStartISO, toISODate, parseLocalDate } from '../../src/utils/dateUtils';
import {
  getDayMap,
  getMonthStats,
  getMonthName,
  toLocalDateStr,
  type WeekStats,
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
import type { CompletedRun, Mission, MissionOutcome, MissionType } from '../../src/types';
import { findMissionById } from '../../src/utils/missionLookup';
import RunShareCard from '../../src/components/share/RunShareCard';
import MonthShareCard from '../../src/components/share/MonthShareCard';
import { shareCard } from '../../src/services/shareService';
import ViewShot from 'react-native-view-shot';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Day cell size fills 7 columns with gaps
const CELL_SIZE = Math.floor((SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * 6) / 7);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMissionTypeFromId(
  missionId: string,
  campaignMissions: Mission[],
  weekMissions: Mission[],
): MissionType | null {
  const m = findMissionById(campaignMissions, weekMissions, missionId);
  return m?.type ?? null;
}

/** Returns ISO weekday index 0 (Mon) … 6 (Sun) for a given Date. */
function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** How many leading empty cells before the 1st of the month. */
function leadingBlanks(year: number, month: number): number {
  return isoWeekday(new Date(year, month, 1));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MonthHeader({
  year,
  month,
  onPrev,
  onNext,
  isCurrentMonth,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  isCurrentMonth: boolean;
}) {
  return (
    <View style={styles.monthHeader}>
      <TouchableOpacity onPress={onPrev} style={styles.navBtn} activeOpacity={0.7}>
        <MaterialIcons name="chevron-left" size={26} color={colors.textPrimary} />
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

function DayCell({
  day,
  missionType,
  isToday,
  isCurrentWeek,
  hasRun,
  isSelected,
  onPress,
}: {
  day: number | null;
  missionType: MissionType | null;
  isToday: boolean;
  isCurrentWeek: boolean;
  hasRun: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  if (day === null) {
    return <View style={[styles.dayCell, styles.dayCellEmpty]} />;
  }

  const config = missionType ? missionConfig[missionType] : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.dayCell,
        isCurrentWeek && !hasRun && styles.dayCellCurrentWeek,
        hasRun && { backgroundColor: config?.color ?? colors.primary },
        isToday && styles.dayCellToday,
        isSelected && styles.dayCellSelected,
      ]}
    >
      {hasRun && config ? (
        <MaterialIcons
          name={config.icon as any}
          size={14}
          color={isSelected ? colors.textPrimary : colors.textInverse}
        />
      ) : null}
      <Text
        style={[
          styles.dayCellText,
          isCurrentWeek && !hasRun && styles.dayCellTextCurrentWeek,
          hasRun && styles.dayCellTextRun,
          isToday && styles.dayCellTextToday,
          isSelected && styles.dayCellTextSelected,
        ]}
      >
        {day}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Day detail panel ────────────────────────────────────────────────────────

function formatPaceDisplay(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01) return '–';
  const paceSecPerKm = (durationMin * 60) / distanceKm;
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function DayDetailPanel({
  dateStr,
  runs,
  campaignMissions,
  weekMissions,
  onDismiss,
  onShare,
}: {
  dateStr: string;
  runs: CompletedRun[];
  campaignMissions: Mission[];
  weekMissions: Mission[];
  onDismiss: () => void;
  onShare: () => void;
}) {
  const date = new Date(dateStr + 'T12:00:00');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const label = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;

  return (
    <Animated.View
      entering={SlideInDown.duration(220)}
      exiting={SlideOutDown.duration(200)}
      style={styles.detailPanel}
    >
      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={styles.detailDate}>{label}</Text>
        <View style={styles.detailHeaderActions}>
          {runs.length > 0 && (
            <TouchableOpacity onPress={onShare} style={styles.detailShareBtn} activeOpacity={0.7}>
              <MaterialIcons name="ios-share" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDismiss} style={styles.detailClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {runs.length === 0 ? (
        /* Rest day */
        <View style={styles.detailRestDay}>
          <MaterialIcons name="bedtime" size={32} color={colors.textTertiary} />
          <View>
            <Text style={styles.detailRestTitle}>Rest day</Text>
            <Text style={styles.detailRestSub}>Recovery is part of training.</Text>
          </View>
        </View>
      ) : (
        /* Run(s) on this day */
        runs.map((run, idx) => {
          const mission = findMissionById(campaignMissions, weekMissions, run.missionId);
          const mType = mission?.type ?? 'easy';
          const config = missionConfig[mType];
          return (
            <View key={idx} style={styles.detailRunCard}>
              {/* Type pill */}
              <View style={[styles.detailTypePill, { backgroundColor: config.bgColor }]}>
                <MaterialIcons name={config.icon as any} size={14} color={config.color} />
                <Text style={[styles.detailTypeLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>

              {/* Stats row */}
              <View style={styles.detailStatsRow}>
                <DetailStat
                  icon="straighten"
                  value={formatDistance(run.distanceKm)}
                  label="Distance"
                  color={colors.blue}
                />
                <DetailStat
                  icon="timer"
                  value={`${Math.round(run.durationMin)} min`}
                  label="Duration"
                  color={colors.orange}
                />
                <DetailStat
                  icon="speed"
                  value={formatPaceDisplay(run.distanceKm, run.durationMin)}
                  label="Pace"
                  color={colors.textSecondary}
                />
              </View>

              {/* XP earned */}
              <View style={styles.detailXpRow}>
                <MaterialIcons name="star" size={15} color={colors.purple} />
                <Text style={styles.detailXpText}>+{run.xpEarned} XP earned</Text>
                <View style={styles.detailStreakPill}>
                  <MaterialIcons name="local-fire-department" size={12} color={colors.orange} />
                  <Text style={styles.detailStreakText}>Day {run.streakDay}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </Animated.View>
  );
}

function DetailStat({
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
    <View style={styles.detailStat}>
      <MaterialIcons name={icon as any} size={14} color={color} />
      <Text style={styles.detailStatValue}>{value}</Text>
      <Text style={styles.detailStatLabel}>{label}</Text>
    </View>
  );
}

function WeekRow({
  week,
  maxXpInMonth,
  isCurrentWeek,
}: {
  week: WeekStats;
  maxXpInMonth: number;
  isCurrentWeek: boolean;
}) {
  const BAR_MAX_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - 100;
  const barWidth = maxXpInMonth > 0 ? (week.totalXp / maxXpInMonth) * BAR_MAX_WIDTH : 0;

  return (
    <View style={[styles.weekRow, isCurrentWeek && styles.weekRowCurrent]}>
      {isCurrentWeek && (
        <View style={styles.weekCurrentBadge}>
          <Text style={styles.weekCurrentBadgeText}>NOW</Text>
        </View>
      )}
      <View style={styles.weekMeta}>
        <Text style={[styles.weekLabel, isCurrentWeek && styles.weekLabelCurrent]}>
          {week.weekLabel}
        </Text>
        <Text style={styles.weekDateRange}>{week.dateRange}</Text>
      </View>

      <View style={styles.weekBarWrap}>
        <View style={styles.weekBarTrack}>
          <View style={[
            styles.weekBarFill,
            isCurrentWeek && styles.weekBarFillCurrent,
            { width: Math.max(barWidth, week.totalXp > 0 ? 8 : 0) },
          ]} />
        </View>
        <View style={styles.weekNumbers}>
          {week.totalRuns > 0 ? (
            <>
              <Text style={styles.weekXp}>+{week.totalXp} XP</Text>
              <Text style={styles.weekRunCount}>
                {week.totalRuns} {week.totalRuns !== 1 ? 'sorties' : 'sortie'}
              </Text>
            </>
          ) : (
            <Text style={styles.weekEmpty}>No sorties</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function MonthSummaryRow({
  totalXp,
  totalRuns,
  totalDistanceKm,
}: {
  totalXp: number;
  totalRuns: number;
  totalDistanceKm: number;
}) {
  return (
    <View style={styles.summaryRow}>
      <SummaryStat value={`${totalXp}`} unit="XP" icon="star" color={colors.purple} />
      <View style={styles.summaryDivider} />
      <SummaryStat value={`${totalRuns}`} unit="sorties" icon="directions-run" color={colors.primary} />
      <View style={styles.summaryDivider} />
      <SummaryStat
        value={formatDistance(totalDistanceKm)}
        unit="total"
        icon="straighten"
        color={colors.blue}
      />
    </View>
  );
}

function SummaryStat({
  value,
  unit,
  icon,
  color,
}: {
  value: string;
  unit: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <MaterialIcons name={icon as any} size={18} color={color} />
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
    </View>
  );
}

// ─── Mission log (all outcomes) ─────────────────────────────────────────────

function resolveOutcome(run: CompletedRun): MissionOutcome {
  if (run.outcome) return run.outcome;
  return run.goalMet ? 'success' : 'failed_goal';
}

function MissionLogList({
  runs,
  campaignMissions,
  weekMissions,
}: {
  runs: CompletedRun[];
  campaignMissions: Mission[];
  weekMissions: Mission[];
}) {
  const sorted = useMemo(
    () => [...runs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [runs],
  );

  if (sorted.length === 0) {
    return (
      <Text style={styles.emptyText}>No mission attempts yet.</Text>
    );
  }

  return (
    <View style={styles.missionLogList}>
      {sorted.map((run) => {
        const mission = findMissionById(campaignMissions, weekMissions, run.missionId);
        const title = mission?.title ?? run.missionId;
        const outcome = resolveOutcome(run);
        const label =
          outcome === 'success' ? 'SUCCEEDED' : outcome === 'aborted' ? 'ABORTED' : 'FAILED';
        const badgeStyle =
          outcome === 'success'
            ? styles.missionLogBadgeOk
            : outcome === 'aborted'
              ? styles.missionLogBadgeAbort
              : styles.missionLogBadgeFail;
        const when = new Date(run.completedAt);
        const dateStr = when.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <View key={`${run.missionId}-${run.completedAt}`} style={styles.missionLogRow}>
            <View style={styles.missionLogLeft}>
              <Text style={styles.missionLogTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.missionLogMeta}>{dateStr}</Text>
              {outcome !== 'aborted' && (
                <Text style={styles.missionLogMeta}>
                  {formatDistance(run.distanceKm)} · {Math.round(run.durationMin)} min
                  {run.xpEarned > 0 ? ` · +${run.xpEarned} XP` : ''}
                </Text>
              )}
            </View>
            <View style={[styles.missionLogBadge, badgeStyle]}>
              <Text style={styles.missionLogBadgeText}>{label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Operation History ────────────────────────────────────────────────────────

function OperationHistoryList() {
  const runHistory = useUserStore((s) => s.runHistory);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const dayOffset = useDevStore((s) => s.dayOffset);
  void dayOffset; // reactivity trigger

  const weekHistory = useMemo(() => {
    const map = new Map<string, number>();
    for (const run of runHistory) {
      const d = new Date(run.completedAt);
      const ws = toISODate(getWeekStart(d));
      map.set(ws, (map.get(ws) ?? 0) + 1);
    }
    const currentWeekStart = getWeekStartISO();
    // Always include current week (from live weeklyProgress)
    map.set(currentWeekStart, weeklyProgress?.runsCompleted ?? map.get(currentWeekStart) ?? 0);

    // Fill in every week between the earliest known week and now so that
    // weeks with 0 completed sorties appear as FAIL instead of being invisible.
    if (map.size > 0) {
      const allKnown = Array.from(map.keys()).sort();
      const earliest = allKnown[0]!;
      let cursor = parseLocalDate(earliest);
      const currentEnd = parseLocalDate(currentWeekStart);
      while (cursor <= currentEnd) {
        const ws = toISODate(cursor);
        if (!map.has(ws)) map.set(ws, 0);
        cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    return Array.from(map.entries())
      .map(([ws, count]) => {
        const start = parseLocalDate(ws);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const fmt = (d: Date) =>
          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          weekStartIso: ws,
          runsCompleted: count,
          goalMet: runsTarget > 0 && count >= runsTarget,
          label: `${fmt(start)} – ${fmt(end)}`,
        };
      })
      .sort((a, b) => b.weekStartIso.localeCompare(a.weekStartIso))
      .slice(0, 10);
  }, [runHistory, weeklyProgress, runsTarget, dayOffset]);

  const currentWeekStart = getWeekStartISO();

  if (weekHistory.length === 0) {
    return (
      <Text style={styles.emptyText}>No sorties recorded yet. Complete your first mission.</Text>
    );
  }

  return (
    <View style={styles.opHistoryList}>
      {weekHistory.map((week, idx) => {
        const isCurrentWeek = week.weekStartIso === currentWeekStart;
        const progressRatio = runsTarget > 0 ? Math.min(week.runsCompleted / runsTarget, 1) : 0;

        let dotStyle = styles.opDotLocked;
        let dotIcon: 'check' | 'directions-run' | 'remove' | 'close' = 'close';
        let badgeColor: string = colors.border;
        let badgeBg: string = 'transparent';
        let badgeLabel = 'FAIL';

        if (week.goalMet) {
          dotStyle = styles.opDotDone;
          dotIcon = 'check';
          badgeColor = colors.primary;
          badgeBg = colors.primaryLight;
          badgeLabel = 'DONE';
        } else if (isCurrentWeek) {
          dotStyle = styles.opDotCurrent;
          dotIcon = 'directions-run';
          badgeColor = colors.orange;
          badgeBg = colors.orange + '22';
          badgeLabel = 'NOW';
        } else if (week.runsCompleted > 0) {
          dotStyle = styles.opDotPartial;
          dotIcon = 'remove';
          badgeColor = colors.ochre;
          badgeBg = colors.ochre + '22';
          badgeLabel = 'PARTIAL';
        }

        return (
          <View key={week.weekStartIso} style={[styles.opRow, isCurrentWeek && styles.opRowCurrent]}>
            <View style={[styles.opDot, dotStyle]}>
              <MaterialIcons name={dotIcon} size={11} color={colors.textInverse} />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opLabel}>{week.label}</Text>
              <View style={styles.opBar}>
                <View style={[styles.opBarFill, {
                  width: `${progressRatio * 100}%` as any,
                  backgroundColor: week.goalMet ? colors.primary : isCurrentWeek ? colors.orange : week.runsCompleted > 0 ? colors.ochre : colors.textTertiary,
                }]} />
              </View>
            </View>
            <Text style={[styles.opCount, week.goalMet && { color: colors.primary }]}>
              {week.runsCompleted}/{runsTarget}
            </Text>
            <View style={[styles.opBadge, { borderColor: badgeColor, backgroundColor: badgeBg }]}>
              <Text style={[styles.opBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  // Subscribe to dayOffset so the calendar re-renders when dev tools change the date
  const dayOffset = useDevStore((s) => s.dayOffset);
  const now = getNow(); // respects mock offset
  void dayOffset; // consumed only for reactivity

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDaySharing, setIsDaySharing] = useState(false);
  const [isMonthSharing, setIsMonthSharing] = useState(false);

  const runHistory = useUserStore((s) => s.runHistory);
  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const weekMissions = useMissionsStore((s) => s.weekMissions);

  const dayShareRef = useRef<ViewShot>(null);
  const monthShareRef = useRef<ViewShot>(null);

  // Keep displayed month in sync when dayOffset jumps to a different month
  useEffect(() => {
    const n = getNow();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDate(null);
  }, [dayOffset]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayStr = toLocalDateStr(now);

  // Current week range (Mon–Sun) for highlighting
  const weekStartStr = getWeekStartISO(); // respects mock offset
  const weekEndStr = toISODate(new Date(new Date(weekStartStr + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000));

  const handlePrev = () => {
    setSelectedDate(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (isCurrentMonth) return;
    setSelectedDate(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDayPress = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const handleDayShare = useCallback(async () => {
    setIsDaySharing(true);
    try {
      await shareCard(dayShareRef);
    } finally {
      setIsDaySharing(false);
    }
  }, []);

  const handleMonthShare = useCallback(async () => {
    setIsMonthSharing(true);
    try {
      await shareCard(monthShareRef);
    } finally {
      setIsMonthSharing(false);
    }
  }, []);

  const dayMap = useMemo(() => getDayMap(runHistory, year, month), [runHistory, year, month]);
  const monthStats = useMemo(() => getMonthStats(runHistory, year, month), [runHistory, year, month]);

  const blanks = leadingBlanks(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const maxWeekXp = Math.max(...monthStats.weeks.map((w) => w.totalXp), 1);

  const selectedRuns = selectedDate ? (dayMap.get(selectedDate) ?? []) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen title */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.titleRow}>
          <Text style={styles.screenTitle}>Monthly Stats</Text>
        </Animated.View>

        {/* Month navigation */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <MonthHeader
            year={year}
            month={month}
            onPrev={handlePrev}
            onNext={handleNext}
            isCurrentMonth={isCurrentMonth}
          />
        </Animated.View>

        {/* Calendar heatmap */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.card}>
          {/* Day-of-week headers */}
          <View style={styles.calendarHeader}>
            {DAY_LABELS.map((label) => (
              <Text key={label} style={styles.calendarDayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return (
                  <DayCell
                    key={`blank-${idx}`}
                    day={null}
                    missionType={null}
                    isToday={false}
                    isCurrentWeek={false}
                    hasRun={false}
                    isSelected={false}
                    onPress={() => {}}
                  />
                );
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const runsOnDay = dayMap.get(dateStr) ?? [];
              const hasRun = runsOnDay.length > 0;
              const firstRun = runsOnDay[0];
              const mType = firstRun
                ? getMissionTypeFromId(firstRun.missionId, campaignMissions, weekMissions)
                : null;
              const inCurrentWeek = dateStr >= weekStartStr && dateStr <= weekEndStr;
              return (
                <DayCell
                  key={dateStr}
                  day={day}
                  missionType={mType}
                  isToday={dateStr === todayStr}
                  isCurrentWeek={inCurrentWeek}
                  hasRun={hasRun}
                  isSelected={selectedDate === dateStr}
                  onPress={() => handleDayPress(dateStr)}
                />
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Run completed</Text>
            <View style={[styles.legendDot, styles.legendDotToday]} />
            <Text style={styles.legendText}>Today</Text>
            <View style={[styles.legendDot, styles.legendDotWeek]} />
            <Text style={styles.legendText}>This week</Text>
          </View>
        </Animated.View>

        {/* Day detail panel — appears when a day is selected */}
        {selectedDate !== null && (
          <DayDetailPanel
            dateStr={selectedDate}
            runs={selectedRuns}
            campaignMissions={campaignMissions}
            weekMissions={weekMissions}
            onDismiss={() => setSelectedDate(null)}
            onShare={handleDayShare}
          />
        )}

        {/* Mission log — all attempts */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.card}>
          <View style={[styles.cardHeader, styles.cardHeaderCluster]}>
            <MaterialIcons name="assignment" size={15} color={colors.orange} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Missions</Text>
          </View>
          <MissionLogList
            runs={runHistory}
            campaignMissions={campaignMissions}
            weekMissions={weekMissions}
          />
        </Animated.View>

        {/* Monthly summary */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Monthly Total</Text>
            {monthStats.totalRuns > 0 && (
              <TouchableOpacity
                onPress={handleMonthShare}
                style={styles.shareIconBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="ios-share"
                  size={18}
                  color={isMonthSharing ? colors.textTertiary : colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          {monthStats.totalRuns > 0 ? (
            <MonthSummaryRow
              totalXp={monthStats.totalXp}
              totalRuns={monthStats.totalRuns}
              totalDistanceKm={monthStats.totalDistanceKm}
            />
          ) : (
            <Text style={styles.emptyText}>No sorties recorded this month yet.</Text>
          )}
        </Animated.View>

        {/* Operation History */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="history" size={15} color={colors.ochre} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Operation History</Text>
          </View>
          <OperationHistoryList />
        </Animated.View>

        {/* Empty state for months with no data */}
        {monthStats.totalRuns === 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.emptyState}>
            <MaterialIcons name="directions-run" size={44} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No sorties in {getMonthName(month)}</Text>
            <Text style={styles.emptySub}>
              Complete missions to see your stats appear here.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Off-screen share cards — invisible, captured by viewShot */}
      <View style={styles.offscreen} pointerEvents="none">
        {/* Day share card — shows first run of the selected day */}
        {selectedDate !== null && selectedRuns.length > 0 && (() => {
          const run = selectedRuns[0]!;
          const mission = findMissionById(campaignMissions, weekMissions, run.missionId);
          return (
            <RunShareCard
              ref={dayShareRef}
              distanceKm={run.distanceKm}
              durationMin={run.durationMin}
              xpEarned={run.xpEarned}
              streakDay={run.streakDay}
              missionType={mission?.type ?? 'easy'}
              path={run.path}
            />
          );
        })()}
        {/* Month share card */}
        <MonthShareCard
          ref={monthShareRef}
          runHistory={runHistory}
          year={year}
          month={month}
        />
      </View>
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

  // Month navigation
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

  // Off-screen capture
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  } as ViewStyle,

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  cardHeaderCluster: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  shareIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,

  // Calendar
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  calendarDayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  } as ViewStyle,
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  } as ViewStyle,
  dayCellEmpty: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  dayCellCurrentWeek: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  dayCellToday: {
    backgroundColor: colors.orange,
    borderWidth: 0,
  } as ViewStyle,
  dayCellText: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  } as TextStyle,
  dayCellTextCurrentWeek: {
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  dayCellTextRun: {
    color: colors.textInverse,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  dayCellTextToday: {
    color: colors.textInverse,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  dayCellSelected: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
    opacity: 0.85,
  } as ViewStyle,
  dayCellTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,

  // Legend
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  } as ViewStyle,
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  } as ViewStyle,
  legendDotToday: {
    backgroundColor: colors.orange,
  } as ViewStyle,
  legendDotWeek: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  legendText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  } as TextStyle,

  // Monthly summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  } as ViewStyle,
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  summaryValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  summaryUnit: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  } as ViewStyle,

  // Weekly rows
  weeksList: {
    gap: spacing.md,
  } as ViewStyle,
  weekRow: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
  } as ViewStyle,
  weekRowCurrent: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radii.md,
  } as ViewStyle,
  weekCurrentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  } as ViewStyle,
  weekCurrentBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 1.5,
  } as TextStyle,
  weekLabelCurrent: {
    color: colors.orange,
  } as TextStyle,
  weekMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  weekLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  weekDateRange: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  weekBarWrap: {
    gap: spacing.xs,
  } as ViewStyle,
  weekBarTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: 'hidden',
  } as ViewStyle,
  weekBarFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: radii.full,
  } as ViewStyle,
  weekBarFillCurrent: {
    backgroundColor: colors.orange,
  } as ViewStyle,
  weekNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  weekXp: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.purple,
  } as TextStyle,
  weekRunCount: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  } as TextStyle,
  weekEmpty: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  } as ViewStyle,
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  } as TextStyle,
  emptySub: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    paddingVertical: spacing.sm,
  } as TextStyle,

  missionLogList: {
    gap: spacing.sm,
  } as ViewStyle,
  missionLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  missionLogLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  } as ViewStyle,
  missionLogTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  missionLogMeta: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  missionLogBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  missionLogBadgeOk: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  missionLogBadgeFail: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  } as ViewStyle,
  missionLogBadgeAbort: {
    borderColor: colors.textTertiary,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  missionLogBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
  } as TextStyle,

  // Operation History
  opHistoryList: {
    gap: spacing.md,
  } as ViewStyle,
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  opRowCurrent: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  } as ViewStyle,
  opDot: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  opDotDone: { backgroundColor: colors.primary } as ViewStyle,
  opDotCurrent: { backgroundColor: colors.orange } as ViewStyle,
  opDotPartial: { backgroundColor: colors.ochre } as ViewStyle,
  opDotLocked: { backgroundColor: colors.border } as ViewStyle,
  opContent: {
    flex: 1,
    gap: 4,
  } as ViewStyle,
  opLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  opBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  } as ViewStyle,
  opBarFill: {
    height: '100%',
    borderRadius: 2,
  } as ViewStyle,
  opCount: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    flexShrink: 0,
  } as TextStyle,
  opBadge: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  } as ViewStyle,
  opBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,

  // Day detail panel
  detailPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  } as ViewStyle,
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  detailDate: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    flex: 1,
  } as TextStyle,
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  detailShareBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  detailClose: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  detailRestDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  detailRestTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  } as TextStyle,
  detailRestSub: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    marginTop: 2,
  } as TextStyle,
  detailRunCard: {
    gap: spacing.md,
  } as ViewStyle,
  detailTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  detailTypeLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  detailStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  } as ViewStyle,
  detailStat: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  } as ViewStyle,
  detailStatValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  detailStatLabel: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  detailXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  detailXpText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.purple,
  } as TextStyle,
  detailStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.orangeLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  } as ViewStyle,
  detailStreakText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.orange,
  } as TextStyle,
});
