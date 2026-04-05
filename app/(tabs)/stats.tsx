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
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useDevStore } from '../../src/store/devStore';
import {
  getNow,
  getWeekStartISO,
  parseLocalDate,
  toISODate,
} from '../../src/utils/dateUtils';
import {
  getDayMap,
  getMonthStats,
  getMonthName,
  getRunsForMonth,
  toLocalDateStr,
  type WeekStats,
} from '../../src/utils/statsUtils';
import { formatDistance } from '../../src/utils/xpCalculator';
import { resolveOutcome } from '../../src/utils/runOutcome';
import { SortieOutcomeBadge } from '../../src/components/ui/SortieOutcomeBadge';
import { RunDetailsModal } from '../../src/components/run/RunDetailsModal';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
  missionConfig,
} from '../../src/constants/theme';
import type { CompletedRun, Mission } from '../../src/types';
import {
  findMissionById,
  resolveMissionDisplayTitle,
} from '../../src/utils/missionLookup';
import { getStreakDayIndex0 } from '../../src/utils/streakDisplay';
import RunShareCard from '../../src/components/share/RunShareCard';
import MonthShareCard from '../../src/components/share/MonthShareCard';
import { shareCard } from '../../src/services/shareService';
import ViewShot from 'react-native-view-shot';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Must match horizontal padding: ScrollView `spacing.xl` + stats card `spacing.lg` on each side. */
const CALENDAR_GAP = spacing.sm;
const CALENDAR_INNER_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - spacing.lg * 2;
// Seven columns with six gaps — if CELL_SIZE is too large, the grid wraps to 6 columns and misaligns weekday headers.
const CELL_SIZE = Math.floor((CALENDAR_INNER_WIDTH - CALENDAR_GAP * 6) / 7);
const DAY_CELL_HEIGHT = Math.max(28, Math.floor(CELL_SIZE * 0.72));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <TouchableOpacity
        onPress={onPrev}
        style={styles.navBtn}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="chevron-left"
          size={26}
          color={colors.textPrimary}
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

function DayCell({
  day,
  isToday,
  isCurrentWeek,
  hasMissionCompleted,
  isSelected,
  onPress,
}: {
  day: number | null;
  isToday: boolean;
  isCurrentWeek: boolean;
  hasMissionCompleted: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  if (day === null) {
    return <View style={[styles.dayCell, styles.dayCellEmpty]} />;
  }

  const missionDone = hasMissionCompleted;
  const todayNoMission = isToday && !missionDone;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.dayCell,
        missionDone && styles.dayCellMissionDone,
        !missionDone && todayNoMission && styles.dayCellToday,
        !missionDone && !todayNoMission && isCurrentWeek && styles.dayCellCurrentWeek,
        isToday && missionDone && styles.dayCellTodayRing,
        isSelected && styles.dayCellSelected,
      ]}
    >
      <Text
        style={[
          styles.dayCellText,
          !missionDone &&
            !todayNoMission &&
            isCurrentWeek &&
            styles.dayCellTextCurrentWeek,
          missionDone && styles.dayCellTextRun,
          todayNoMission && styles.dayCellTextToday,
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
  runHistory,
  weekMissions,
  onDismiss,
  onShare,
  onRunPress,
}: {
  dateStr: string;
  runs: CompletedRun[];
  runHistory: CompletedRun[];
  weekMissions: Mission[];
  onDismiss: () => void;
  onShare: () => void;
  onRunPress: (run: CompletedRun) => void;
}) {
  const date = new Date(dateStr + 'T12:00:00');
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
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
            <TouchableOpacity
              onPress={onShare}
              style={styles.detailShareBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="ios-share"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.detailClose}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {runs.length === 0 ? (
        /* Rest day */
        <View style={styles.detailRestDay}>
          <MaterialIcons name="bedtime" size={32} color={colors.textTertiary} />
          <Text style={styles.detailRestTitle}>
            No mission completed on this date.
          </Text>
        </View>
      ) : (
        /* Run(s) on this day */
        runs.map((run) => {
          const mission = findMissionById(weekMissions, run.missionId);
          const mType = mission?.type ?? 'easy';
          const config = missionConfig[mType];
          const outcome = resolveOutcome(run);
          return (
            <TouchableOpacity
              key={`${run.missionId}-${run.completedAt}`}
              style={styles.detailRunCard}
              onPress={() => onRunPress(run)}
              activeOpacity={0.85}
            >
              <View style={styles.detailRunHeaderRow}>
                <View
                  style={[
                    styles.detailTypePill,
                    { backgroundColor: config.bgColor },
                  ]}
                >
                  <MaterialIcons
                    name={config.icon as any}
                    size={14}
                    color={config.color}
                  />
                  <Text
                    style={[styles.detailTypeLabel, { color: config.color }]}
                  >
                    {config.label}
                  </Text>
                </View>
                <SortieOutcomeBadge outcome={outcome} />
              </View>

              {/* Stats row */}
              <View style={styles.detailStatsRow}>
                <DetailStat
                  icon="straighten"
                  value={formatDistance(run.distanceKm)}
                  label="Distance"
                  color={colors.textPrimary}
                />
                <DetailStat
                  icon="timer"
                  value={`${Math.round(run.durationMin)} min`}
                  label="Duration"
                  color={colors.textPrimary}
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
                <Text style={styles.detailXpText}>
                  +{run.xpEarned} XP earned
                </Text>
                <View style={styles.detailStreakPill}>
                  <MaterialIcons
                    name="local-fire-department"
                    size={12}
                    color={colors.orange}
                  />
                  <Text style={styles.detailStreakText}>
                    Day {getStreakDayIndex0(run, runHistory)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  const barWidth =
    maxXpInMonth > 0 ? (week.totalXp / maxXpInMonth) * BAR_MAX_WIDTH : 0;

  return (
    <View style={[styles.weekRow, isCurrentWeek && styles.weekRowCurrent]}>
      {isCurrentWeek && (
        <View style={styles.weekCurrentBadge}>
          <Text style={styles.weekCurrentBadgeText}>NOW</Text>
        </View>
      )}
      <View style={styles.weekMeta}>
        <Text
          style={[styles.weekLabel, isCurrentWeek && styles.weekLabelCurrent]}
        >
          {week.weekLabel}
        </Text>
        <Text style={styles.weekDateRange}>{week.dateRange}</Text>
      </View>

      <View style={styles.weekBarWrap}>
        <View style={styles.weekBarTrack}>
          <View
            style={[
              styles.weekBarFill,
              isCurrentWeek && styles.weekBarFillCurrent,
              { width: Math.max(barWidth, week.totalXp > 0 ? 8 : 0) },
            ]}
          />
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
      <SummaryStat
        value={`${totalXp}`}
        unit="XP"
        icon="star"
        color={colors.purple}
      />
      <View style={styles.summaryDivider} />
      <SummaryStat
        value={`${totalRuns}`}
        unit="sorties"
        icon="directions-run"
        color={colors.primary}
      />
      <View style={styles.summaryDivider} />
      <SummaryStat
        value={formatDistance(totalDistanceKm)}
        unit="total"
        icon="straighten"
        color={colors.primary}
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

function formatMissionLogDayHeader(dayKey: string): string {
  return parseLocalDate(dayKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function MissionLogList({
  runs,
  weekMissions,
  emptyLabel = 'No mission attempts yet.',
  onRunPress,
}: {
  runs: CompletedRun[];
  weekMissions: Mission[];
  emptyLabel?: string;
  onRunPress: (run: CompletedRun) => void;
}) {
  const personaId = useUserStore((s) => s.profile?.personaId ?? s.personaId);

  const groupedByDay = useMemo(() => {
    const sorted = [...runs].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    );
    const sections: { dayKey: string; runs: CompletedRun[] }[] = [];
    let currentKey: string | null = null;
    for (const run of sorted) {
      const dayKey = toISODate(new Date(run.completedAt));
      if (dayKey !== currentKey) {
        currentKey = dayKey;
        sections.push({ dayKey, runs: [run] });
      } else {
        sections[sections.length - 1]!.runs.push(run);
      }
    }
    return sections;
  }, [runs]);

  if (groupedByDay.length === 0) {
    return <Text style={styles.emptyText}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.missionLogList}>
      {groupedByDay.map(({ dayKey, runs: dayRuns }, sectionIdx) => (
        <View
          key={dayKey}
          style={[
            styles.missionLogSection,
            sectionIdx > 0 && styles.missionLogSectionSpaced,
          ]}
        >
          <Text style={styles.missionLogSectionHeader}>
            {formatMissionLogDayHeader(dayKey)}
          </Text>
          {dayRuns.map((run, runIdx) => {
            const mission = findMissionById(weekMissions, run.missionId);
            const title = resolveMissionDisplayTitle(
              run.missionId,
              mission,
              personaId,
            );
            const outcome = resolveOutcome(run);
            const when = new Date(run.completedAt);
            const timeStr = when.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                key={`${run.missionId}-${run.completedAt}`}
                style={[
                  styles.missionLogRow,
                  runIdx === dayRuns.length - 1 &&
                    styles.missionLogRowLastInSection,
                ]}
                onPress={() => onRunPress(run)}
                activeOpacity={0.85}
              >
                <View style={styles.missionLogLeft}>
                  <Text style={styles.missionLogTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.missionLogMeta}>{timeStr}</Text>
                  {outcome !== 'aborted' && (
                    <Text style={styles.missionLogMeta}>
                      {formatDistance(run.distanceKm)} ·{' '}
                      {Math.round(run.durationMin)} min
                      {run.xpEarned > 0 ? ` · +${run.xpEarned} XP` : ''}
                    </Text>
                  )}
                </View>
                <SortieOutcomeBadge outcome={outcome} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
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
  const [missionLogExpanded, setMissionLogExpanded] = useState(false);
  const [runDetails, setRunDetails] = useState<CompletedRun | null>(null);

  const runHistory = useUserStore((s) => s.runHistory);
  const profilePersona = useUserStore((s) => s.profile?.personaId ?? s.personaId);
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
  const weekEndStr = toISODate(
    new Date(
      new Date(weekStartStr + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000,
    ),
  );

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

  const dayMap = useMemo(
    () => getDayMap(runHistory, year, month),
    [runHistory, year, month],
  );
  const monthStats = useMemo(
    () => getMonthStats(runHistory, year, month),
    [runHistory, year, month],
  );
  /** Mission log lists runs for the same month as the calendar navigator (year/month). */
  const { runsForMissionLog, missionsEmptyLabel, missionLogPeriodLabel } =
    useMemo(() => {
      return {
        runsForMissionLog: getRunsForMonth(runHistory, year, month),
        missionsEmptyLabel: `No mission attempts in ${getMonthName(month)} ${year} yet.`,
        missionLogPeriodLabel: `${getMonthName(month)} ${year}`,
      };
    }, [runHistory, year, month]);

  const missionLogHasRuns = runsForMissionLog.length > 0;

  useEffect(() => {
    if (!missionLogHasRuns) setMissionLogExpanded(false);
  }, [missionLogHasRuns]);

  /** Calendar month shown in the heatmap — for empty-state copy only. */
  const viewedMonthHasRuns = monthStats.totalRuns > 0;

  const monthlySectionSubtitle = isCurrentMonth
    ? 'This month'
    : `${getMonthName(month)} ${year}`;

  const blanks = leadingBlanks(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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

        {/* Monthly summary — totals for the month shown in the calendar */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(300)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={styles.monthlyTotalTitleCol}>
              <Text style={styles.sectionTitle}>Monthly Total</Text>
              <Text style={styles.sectionSub}>{monthlySectionSubtitle}</Text>
            </View>
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
            <Text style={styles.emptyText}>
              No sorties recorded for this month yet.
            </Text>
          )}
        </Animated.View>

        {/* Month navigation */}
        <Animated.View entering={FadeInDown.delay(55).duration(300)}>
          <MonthHeader
            year={year}
            month={month}
            onPrev={handlePrev}
            onNext={handleNext}
            isCurrentMonth={isCurrentMonth}
          />
        </Animated.View>

        {/* Calendar heatmap */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.card}
        >
          <View style={styles.calendarHeatmapBlock}>
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
                      isToday={false}
                      isCurrentWeek={false}
                      hasMissionCompleted={false}
                      isSelected={false}
                      onPress={() => {}}
                    />
                  );
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const runsOnDay = dayMap.get(dateStr) ?? [];
                const hasMissionCompleted = runsOnDay.some((r) => r.goalMet);
                const inCurrentWeek =
                  dateStr >= weekStartStr && dateStr <= weekEndStr;
                return (
                  <DayCell
                    key={dateStr}
                    day={day}
                    isToday={dateStr === todayStr}
                    isCurrentWeek={inCurrentWeek}
                    hasMissionCompleted={hasMissionCompleted}
                    isSelected={selectedDate === dateStr}
                    onPress={() => handleDayPress(dateStr)}
                  />
                );
              })}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.primary }]}
            />
            <Text style={styles.legendText}>Mission completed</Text>
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
            runHistory={runHistory}
            weekMissions={weekMissions}
            onDismiss={() => setSelectedDate(null)}
            onShare={handleDayShare}
            onRunPress={(run) => setRunDetails(run)}
          />
        )}

        {/* Mission log — selected calendar month; collapsed until expanded */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(300)}
          style={styles.card}
        >
          {missionLogHasRuns ? (
            <TouchableOpacity
              style={styles.missionLogHeader}
              onPress={() => setMissionLogExpanded((e) => !e)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: missionLogExpanded }}
            >
              <View style={styles.missionLogHeaderMain}>
                <MaterialIcons name="assignment" size={15} color={colors.orange} />
                <View style={styles.missionLogHeaderTextCol}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textSecondary }]}
                  >
                    Mission Log
                  </Text>
                  {!missionLogExpanded && (
                    <Text style={styles.missionLogCollapsedHint}>
                      {`${runsForMissionLog.length} attempt${
                        runsForMissionLog.length === 1 ? '' : 's'
                      } ${isCurrentMonth ? 'this month' : `in ${getMonthName(month)} ${year}`} · Tap to expand`}
                    </Text>
                  )}
                  {missionLogExpanded && (
                    <Text style={styles.missionLogCollapsedHint}>
                      {missionLogPeriodLabel}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialIcons
                name={missionLogExpanded ? 'expand-less' : 'expand-more'}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.missionLogHeader}>
              <View style={styles.missionLogHeaderMain}>
                <MaterialIcons name="assignment" size={15} color={colors.orange} />
                <View style={styles.missionLogHeaderTextCol}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textSecondary }]}
                  >
                    Mission Log
                  </Text>
                  <Text style={styles.missionLogCollapsedHint}>
                    {missionsEmptyLabel}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {missionLogHasRuns && missionLogExpanded && (
            <MissionLogList
              runs={runsForMissionLog}
              weekMissions={weekMissions}
              emptyLabel={missionsEmptyLabel}
              onRunPress={(run) => setRunDetails(run)}
            />
          )}
        </Animated.View>

        {/* Empty state for months with no data */}
        {!viewedMonthHasRuns && (
          <Animated.View
            entering={FadeInDown.delay(250).duration(300)}
            style={styles.emptyState}
          >
            <MaterialIcons
              name="directions-run"
              size={44}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>
              No sorties in {getMonthName(month)}
            </Text>
            <Text style={styles.emptySub}>
              Complete missions to see your stats appear here.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <RunDetailsModal
        visible={runDetails != null}
        onClose={() => setRunDetails(null)}
        run={runDetails}
        mission={
          runDetails
            ? findMissionById(weekMissions, runDetails.missionId)
            : undefined
        }
        personaId={profilePersona}
      />

      {/* Off-screen share cards — invisible, captured by viewShot */}
      <View style={styles.offscreen} pointerEvents="none">
        {/* Day share card — shows first run of the selected day */}
        {selectedDate !== null &&
          selectedRuns.length > 0 &&
          (() => {
            const run = selectedRuns[0]!;
            const mission = findMissionById(weekMissions, run.missionId);
            return (
              <RunShareCard
                ref={dayShareRef}
                distanceKm={run.distanceKm}
                durationMin={run.durationMin}
                xpEarned={run.xpEarned}
                streakDay={getStreakDayIndex0(run, runHistory)}
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
  missionLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  missionLogHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minWidth: 0,
  } as ViewStyle,
  missionLogHeaderTextCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  } as ViewStyle,
  missionLogCollapsedHint: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  } as TextStyle,
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  monthlyTotalTitleCol: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  sectionSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
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
  calendarHeatmapBlock: {
    gap: spacing.xs,
  } as ViewStyle,
  calendarHeader: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    gap: CALENDAR_GAP,
  } as ViewStyle,
  calendarDayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 1,
  } as TextStyle,
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CALENDAR_GAP,
  } as ViewStyle,
  dayCell: {
    width: CELL_SIZE,
    height: DAY_CELL_HEIGHT,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingVertical: 1,
  } as ViewStyle,
  dayCellEmpty: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  dayCellCurrentWeek: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  /** Today when no mission completed that day — only this state uses orange fill */
  dayCellToday: {
    backgroundColor: colors.orange,
    borderWidth: 0,
  } as ViewStyle,
  dayCellMissionDone: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  /** Today + at least one goal met — green cell, orange ring */
  dayCellTodayRing: {
    borderWidth: 2,
    borderColor: colors.orange,
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
    gap: 0,
  } as ViewStyle,
  missionLogSection: {} as ViewStyle,
  missionLogSectionSpaced: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  missionLogSectionHeader: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  } as TextStyle,
  missionLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  missionLogRowLastInSection: {
    borderBottomWidth: 0,
    paddingBottom: 0,
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
    flex: 1,
  } as TextStyle,
  detailRunCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  } as ViewStyle,
  detailRunHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  detailStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  detailStatusBadgeOk: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  detailStatusBadgeBad: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  } as ViewStyle,
  detailStatusBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  detailStatusBadgeTextOk: {
    color: colors.primary,
  } as TextStyle,
  detailStatusBadgeTextBad: {
    color: colors.red,
  } as TextStyle,
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
