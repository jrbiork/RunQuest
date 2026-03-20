import { useState, useMemo, useCallback, useRef } from 'react';
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
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
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
import type { CompletedRun, MissionType } from '../../src/types';
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
  weekMissions: ReturnType<typeof useMissionsStore.getState>['weekMissions'],
): MissionType | null {
  const m = weekMissions.find((w) => w.id === missionId);
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
  hasRun,
  isSelected,
  onPress,
}: {
  day: number | null;
  missionType: MissionType | null;
  isToday: boolean;
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
          hasRun && styles.dayCellTextRun,
          isToday && !hasRun && styles.dayCellTextToday,
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
  weekMissions,
  onDismiss,
  onShare,
}: {
  dateStr: string;
  runs: CompletedRun[];
  weekMissions: ReturnType<typeof useMissionsStore.getState>['weekMissions'];
  onDismiss: () => void;
  onShare: () => void;
}) {
  const date = new Date(dateStr + 'T12:00:00');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const label = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(200)}
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
          const mission = weekMissions.find((m) => m.id === run.missionId);
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
}: {
  week: WeekStats;
  maxXpInMonth: number;
}) {
  const BAR_MAX_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - 100;
  const barWidth = maxXpInMonth > 0 ? (week.totalXp / maxXpInMonth) * BAR_MAX_WIDTH : 0;

  return (
    <View style={styles.weekRow}>
      <View style={styles.weekMeta}>
        <Text style={styles.weekLabel}>{week.weekLabel}</Text>
        <Text style={styles.weekDateRange}>{week.dateRange}</Text>
      </View>

      <View style={styles.weekBarWrap}>
        <View style={styles.weekBarTrack}>
          <View style={[styles.weekBarFill, { width: Math.max(barWidth, week.totalXp > 0 ? 8 : 0) }]} />
        </View>
        <View style={styles.weekNumbers}>
          {week.totalRuns > 0 ? (
            <>
              <Text style={styles.weekXp}>+{week.totalXp} XP</Text>
              <Text style={styles.weekRunCount}>
                {week.totalRuns} run{week.totalRuns !== 1 ? 's' : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.weekEmpty}>No runs</Text>
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
      <SummaryStat value={`${totalRuns}`} unit="runs" icon="directions-run" color={colors.primary} />
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDaySharing, setIsDaySharing] = useState(false);
  const [isMonthSharing, setIsMonthSharing] = useState(false);

  const runHistory = useUserStore((s) => s.runHistory);
  const weekMissions = useMissionsStore((s) => s.weekMissions);

  const dayShareRef = useRef<ViewShot>(null);
  const monthShareRef = useRef<ViewShot>(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayStr = toLocalDateStr(now);

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
                ? getMissionTypeFromId(firstRun.missionId, weekMissions)
                : null;
              return (
                <DayCell
                  key={dateStr}
                  day={day}
                  missionType={mType}
                  isToday={dateStr === todayStr}
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
          </View>
        </Animated.View>

        {/* Day detail panel — appears when a day is selected */}
        {selectedDate !== null && (
          <DayDetailPanel
            dateStr={selectedDate}
            runs={selectedRuns}
            weekMissions={weekMissions}
            onDismiss={() => setSelectedDate(null)}
            onShare={handleDayShare}
          />
        )}

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
            <Text style={styles.emptyText}>No runs recorded this month yet.</Text>
          )}
        </Animated.View>

        {/* Weekly XP breakdown */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
          <View style={styles.weeksList}>
            {monthStats.weeks.map((week) => (
              <WeekRow key={week.weekIndex} week={week} maxXpInMonth={maxWeekXp} />
            ))}
          </View>
        </Animated.View>

        {/* Empty state for months with no data */}
        {monthStats.totalRuns === 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.emptyState}>
            <MaterialIcons name="directions-run" size={44} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No runs in {getMonthName(month)}</Text>
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
          const mission = weekMissions.find((m) => m.id === run.missionId);
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
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
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
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
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
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,
  dayCellText: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  } as TextStyle,
  dayCellTextRun: {
    color: colors.textInverse,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  dayCellTextToday: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  } as TextStyle,
  dayCellSelected: {
    borderWidth: 3,
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
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
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
  } as ViewStyle,
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
