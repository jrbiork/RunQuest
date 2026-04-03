import { useEffect, useMemo, useCallback, useReducer, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useUserStore,
  selectWeeklyRunsTarget,
  selectWeeklyDistanceTarget,
} from '../../src/store/userStore';
import {
  getLevelInfo,
  getOverallLevelRingProgress,
  getScavengerLevelRows,
  formatDistance,
  formatDuration,
  SCAVENGER_LEVEL_COUNT,
} from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';
import { useMissionsStore } from '../../src/store/missionsStore';
import { getNextIncompleteMission } from '../../src/utils/missionGenerator';
import { useStreak } from '../../src/hooks/useStreak';
import { DailyMissionCard } from '../../src/components/home/DailyMissionCard';
import { WeeklyProgressCard } from '../../src/components/home/WeeklyProgressCard';
import { CircularStatBadge } from '../../src/components/ui/CircularStatBadge';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../src/constants/theme';
import { REST_DAY_MESSAGES } from '../../src/constants/missions';
import { useDevStore } from '../../src/store/devStore';
import { getWeekStartISO, parseLocalDate } from '../../src/utils/dateUtils';
import type { CompletedRun } from '../../src/types';

function getRestMessage(): string {
  return REST_DAY_MESSAGES[
    Math.floor(Math.random() * REST_DAY_MESSAGES.length)
  ] as string;
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatStreakDayLabel(dateKey: string): string {
  const [y, mo, da] = dateKey.split('-').map(Number);
  const dt = new Date(y, mo - 1, da);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Days with at least one successful mission (goal met), with completion times. */
function buildStreakDayGroups(
  runs: CompletedRun[],
): { dateKey: string; dateLabel: string; times: string[] }[] {
  const map = new Map<string, string[]>();
  for (const run of runs) {
    if (!run.goalMet) continue;
    const key = toLocalDateKey(run.completedAt);
    const t = new Date(run.completedAt);
    const timeStr = t.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(timeStr);
  }
  for (const arr of map.values()) arr.sort();
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, times]) => ({
      dateKey,
      dateLabel: formatStreakDayLabel(dateKey),
      times,
    }));
}

function formatSortiePace(dKm: number, durMin: number): string {
  if (dKm < 0.01 || durMin <= 0) return '—';
  const minPerKm = durMin / dKm;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

type HomeStatModal = null | 'streak' | 'level' | 'sorties';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const rootPersonaId = useUserStore((s) => s.personaId);
  const personaIdForXp = profile?.personaId ?? rootPersonaId ?? undefined;
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);
  const totalCampaignsCompleted = useUserStore(
    (s) => s.totalCampaignsCompleted,
  );
  const totalRuns = useUserStore((s) => s.totalRuns);
  const hasSeenIntro = useUserStore((s) => s.hasSeenIntro);
  const currentCampaignIndex = useMissionsStore((s) => s.currentCampaignIndex);
  const displayXpTotal = useMemo(
    () =>
      getDisplayXpTotal({
        xp,
        runHistory,
        personaId: personaIdForXp,
        totalCampaignsCompleted,
        currentCampaignIndex,
      }),
    [
      xp,
      runHistory,
      personaIdForXp,
      totalCampaignsCompleted,
      currentCampaignIndex,
    ],
  );
  const levelInfo = useMemo(
    () => getLevelInfo(displayXpTotal),
    [displayXpTotal],
  );
  /** Cumulative XP required to reach the next level. */
  const nextLevelXpThreshold = useMemo(() => {
    const li = levelInfo;
    return li.totalXp - li.xpInLevel + li.xpToNextLevel;
  }, [levelInfo]);
  /** e.g. "+10 XP to Level 3" */
  const levelProgressLabel = useMemo(() => {
    const li = levelInfo;
    if (li.level >= SCAVENGER_LEVEL_COUNT) {
      return 'Max level';
    }
    const xpRemaining = Math.max(
      0,
      Math.round(nextLevelXpThreshold - displayXpTotal),
    );
    return `+${xpRemaining} XP to Level ${li.level + 1}`;
  }, [levelInfo, nextLevelXpThreshold, displayXpTotal]);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const distanceTarget = useUserStore(selectWeeklyDistanceTarget);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const refreshWeekly = useUserStore((s) => s.refreshWeeklyProgressIfNeeded);

  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const generateWeek = useMissionsStore((s) => s.generateWeek);
  const { streak } = useStreak();
  const dayOffset = useDevStore((s) => s.dayOffset);

  const [statModal, setStatModal] = useState<HomeStatModal>(null);

  const streakDayGroups = useMemo(
    () => buildStreakDayGroups(runHistory),
    [runHistory],
  );
  const scavengerLevels = useMemo(() => getScavengerLevelRows(), []);
  const sortiesChronological = useMemo(
    () =>
      [...runHistory].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [runHistory],
  );

  // Forces weekly date-range label + mission sync when dev “mock date” changes.
  const [dateTick, bumpDateTick] = useReducer((n: number) => n + 1, 0);

  // Mirrors the Journey tab pattern: compare stored week start vs mocked week start,
  // call generateWeek directly when they differ (avoids refreshIfNewWeek race condition).
  function syncMissions(p: typeof profile) {
    if (!p) return;
    const mockedWeekStart = getWeekStartISO();
    const storedWeekStart = useMissionsStore.getState().weekStartDate;
    if (mockedWeekStart !== storedWeekStart) {
      generateWeek(p);
    }
  }

  useEffect(() => {
    if (!hasSeenIntro) {
      router.replace('/intro');
      return;
    }
    if (!profile) {
      router.replace('/onboarding');
      return;
    }
    refreshWeekly();
    syncMissions(profile);
  }, []);

  // Re-check every time the dev-tool day changes (profile tab → home tab background)
  useEffect(() => {
    refreshWeekly();
    syncMissions(profile);
    bumpDateTick();
  }, [dayOffset]);

  // Re-check every time this tab gains focus (e.g. navigating back from profile)
  useFocusEffect(
    useCallback(() => {
      refreshWeekly();
      syncMissions(profile);
      bumpDateTick();
    }, [dayOffset, profile]),
  );

  // Same order as Journey: first mission that is not completed (no calendar / weekday pick).
  const nextMission = useMemo(() => {
    const list = campaignMissions.length > 0 ? campaignMissions : weekMissions;
    return getNextIncompleteMission(list);
  }, [campaignMissions, weekMissions]);

  // Week date range label — recomputed on every date tick
  const weekDateRange = useMemo(() => {
    const startIso = getWeekStartISO();
    const start = parseLocalDate(startIso);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTick]);

  const runsCompleted = weeklyProgress?.runsCompleted ?? 0;
  const distanceCompleted = weeklyProgress?.distanceCompletedKm ?? 0;

  const weeklyRunProgress = runsTarget > 0 ? runsCompleted / runsTarget : 0;
  const weeklyDistProgress =
    distanceTarget > 0 ? distanceCompleted / distanceTarget : 0;

  const handleStartRun = () => {
    if (nextMission) {
      router.push({ pathname: '/run/[id]', params: { id: nextMission.id } });
    }
  };

  const handleViewJourney = () => {
    router.push('/(tabs)/journey');
  };

  const handleSettings = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, styles.scrollContent]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refreshWeekly();
              syncMissions(profile);
            }}
            tintColor={colors.orange}
          />
        }
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.wordmark}>RUNQUEST</Text>
            <View style={styles.levelBadge}>
              <MaterialIcons
                name="military-tech"
                size={12}
                color={colors.orange}
              />
              <View style={styles.levelBadgeTextRow}>
                <Text style={styles.levelBadgeLabel}>
                  LVL {levelInfo.level} SCAVENGER
                </Text>
                <Text style={styles.levelBadgeMeta}> {levelProgressLabel}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleSettings} style={styles.settingsBtn}>
            <MaterialIcons
              name="settings"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Current Mission (below title + level) ───────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Current Mission</Text>
          </View>
          {nextMission ? (
            <DailyMissionCard
              mission={nextMission}
              onStartRun={handleStartRun}
            />
          ) : (
            <RestDayCard onViewJourney={handleViewJourney} />
          )}
        </View>

        {/* Pushes stats row to bottom when scroll content is shorter than screen */}
        <View style={styles.statsSpacer} />

        <Modal
          visible={statModal !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setStatModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropDismiss}
              activeOpacity={1}
              onPress={() => setStatModal(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {statModal === 'streak' && 'Streak days'}
                  {statModal === 'level' && 'Scavenger levels'}
                  {statModal === 'sorties' && 'Sortie log'}
                </Text>
                <TouchableOpacity
                  onPress={() => setStatModal(null)}
                  hitSlop={12}
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {statModal === 'streak' && (
                  <>
                    {streakDayGroups.length === 0 ? (
                      <Text style={styles.modalEmpty}>
                        No successful missions yet. Complete a mission to build
                        your streak.
                      </Text>
                    ) : (
                      streakDayGroups.map((g) => (
                        <View key={g.dateKey} style={styles.modalSection}>
                          <Text style={styles.modalSectionTitle}>
                            {g.dateLabel}
                          </Text>
                          {g.times.map((t, i) => (
                            <Text
                              key={`${g.dateKey}-${i}`}
                              style={styles.modalLine}
                            >
                              {t}
                            </Text>
                          ))}
                        </View>
                      ))
                    )}
                  </>
                )}
                {statModal === 'level' && (
                  <>
                    <Text style={styles.modalSub}>
                      {personaIdForXp
                        ? `Persona levels use the same Scavenger ladder across all operatives.`
                        : `Scavenger level ladder.`}
                    </Text>
                    {scavengerLevels.map((row) => {
                      const current = row.level === levelInfo.level;
                      return (
                        <View
                          key={row.level}
                          style={[
                            styles.levelRow,
                            current && styles.levelRowCurrent,
                          ]}
                        >
                          <Text
                            style={[
                              styles.levelRowNum,
                              current && styles.levelRowNumCurrent,
                            ]}
                          >
                            {row.level}
                          </Text>
                          <View style={styles.levelRowText}>
                            <Text
                              style={[
                                styles.levelRowTitle,
                                current && styles.levelRowTitleCurrent,
                              ]}
                            >
                              {row.title}
                            </Text>
                            <Text style={styles.levelRowXp}>
                              {row.minXp.toLocaleString()} XP to reach
                            </Text>
                          </View>
                          {current && (
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color={colors.ochre}
                            />
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
                {statModal === 'sorties' && (
                  <>
                    {sortiesChronological.length === 0 ? (
                      <Text style={styles.modalEmpty}>No sorties yet.</Text>
                    ) : (
                      sortiesChronological.map((run) => {
                        const dt = new Date(run.completedAt);
                        const dateStr = dt.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const timeStr = dt.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        });
                        return (
                          <View
                            key={`${run.missionId}-${run.completedAt}`}
                            style={styles.sortieRow}
                          >
                            <Text style={styles.sortieDate}>
                              {dateStr} · {timeStr}
                            </Text>
                            <Text style={styles.sortieMeta}>
                              {formatDistance(run.distanceKm)} ·{' '}
                              {formatDuration(run.durationMin)} ·{' '}
                              {formatSortiePace(
                                run.distanceKm,
                                run.durationMin,
                              )}{' '}
                              pace
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── Weekly Goal ─────────────────────────────────────────────── */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Weekly Goal</Text>
          </View>
          <WeeklyProgressCard
            runsCompleted={runsCompleted}
            runsTarget={runsTarget}
            distanceCompletedKm={distanceCompleted}
            distanceTargetKm={distanceTarget}
            mode={profile?.weeklyTargetMode ?? 'runs'}
            dateRange={weekDateRange}
          />
        </View> */}

        {/* ─── Circular Stat Badges (bottom of home) ────────────────────── */}
        <View style={styles.statsBadgeRow}>
          <TouchableOpacity
            style={styles.statBadgeTouchable}
            onPress={() => setStatModal('streak')}
            activeOpacity={0.85}
          >
            <CircularStatBadge
              value={streak}
              label="Day Streak"
              icon="local-fire-department"
              ringColor={colors.orange}
              progress={Math.min(streak / 30, 1)}
              size={84}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBadgeTouchable}
            onPress={() => setStatModal('level')}
            activeOpacity={0.85}
          >
            <CircularStatBadge
              value={levelInfo.level}
              label="Level"
              icon="military-tech"
              ringColor={colors.ochre}
              progress={getOverallLevelRingProgress(levelInfo)}
              size={84}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBadgeTouchable}
            onPress={() => setStatModal('sorties')}
            activeOpacity={0.85}
          >
            <CircularStatBadge
              value={totalRuns}
              label="Sorties"
              icon="directions-run"
              ringColor={colors.primary}
              progress={Math.min(totalRuns / 50, 1)}
              size={84}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RestDayCard({ onViewJourney }: { onViewJourney: () => void }) {
  return (
    <Card style={styles.restCard}>
      <MaterialIcons
        name="self-improvement"
        size={44}
        color={colors.textTertiary}
      />
      <Text style={styles.restTitle}>{getRestMessage()}</Text>
      <Text style={styles.restSub}>
        No missions left in your current deployment, or open Journey to review
        progress.
      </Text>
      <Button
        label="View Journey"
        onPress={onViewJourney}
        variant="secondary"
        size="md"
        style={styles.restBtn}
      />
    </Card>
  );
}

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
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  } as ViewStyle,
  /** Lets short screens pin the stats row to the bottom of the scroll area */
  scrollContent: {
    flexGrow: 1,
  } as ViewStyle,
  statsSpacer: {
    flexGrow: 1,
    minHeight: 0,
  } as ViewStyle,

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  } as ViewStyle,
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
    marginRight: spacing.md,
    minWidth: 0,
  } as ViewStyle,
  wordmark: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    maxWidth: '100%',
  } as ViewStyle,
  levelBadgeTextRow: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  } as ViewStyle,
  levelBadgeLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  levelBadgeMeta: {
    fontSize: 9,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } as TextStyle,
  settingsBtn: {
    padding: spacing.sm,
  } as ViewStyle,

  // Circular stats row (bottom of home — no top/bottom rules)
  statsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  } as ViewStyle,
  statBadgeTouchable: {
    flex: 1,
    alignItems: 'center',
  } as ViewStyle,

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  } as ViewStyle,
  modalBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  } as ViewStyle,
  modalCard: {
    maxHeight: '72%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  modalTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  } as TextStyle,
  modalScroll: {
    maxHeight: 420,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } as ViewStyle,
  modalEmpty: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingVertical: spacing.md,
  } as TextStyle,
  modalSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    lineHeight: 18,
  } as TextStyle,
  modalSection: {
    marginBottom: spacing.lg,
  } as ViewStyle,
  modalSectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.orange,
    marginBottom: spacing.xs,
  } as TextStyle,
  modalLine: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    paddingLeft: spacing.sm,
    marginBottom: 2,
  } as TextStyle,
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  levelRowCurrent: {
    borderColor: colors.ochre,
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
  } as ViewStyle,
  levelRowNum: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    width: 28,
  } as TextStyle,
  levelRowNumCurrent: {
    color: colors.ochre,
  } as TextStyle,
  levelRowText: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  levelRowTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  levelRowTitleCurrent: {
    color: colors.ochre,
  } as TextStyle,
  levelRowXp: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  sortieRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  sortieDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  } as TextStyle,
  sortieMeta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Section layout
  section: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  accentBar: {
    width: 3,
    height: 16,
    backgroundColor: colors.ochre,
    borderRadius: 2,
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,

  // Rest day
  restCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    marginVertical: spacing.sm,
  } as ViewStyle,
  restTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  restSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  } as TextStyle,
  restBtn: {
    marginTop: spacing.sm,
  } as ViewStyle,
});
