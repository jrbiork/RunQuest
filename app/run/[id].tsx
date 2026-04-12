import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMissionsStore } from '../../src/store/missionsStore';
import { XPBadge } from '../../src/components/ui/XPBadge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';
import {
  formatDistance,
  formatDuration,
  getDisplayXpWithStartingLevelOffset,
  getLevelInfo,
} from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';
import { FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import {
  findMissionById,
  normalizeRouteParam,
} from '../../src/utils/missionLookup';
import { stripEmojis } from '../../src/utils/stripEmojis';
import { useUserStore } from '../../src/store/userStore';
import type { ActivityMode } from '../../src/types';
import { logEvent, Events } from '../../src/services/analytics';

/** Darken a #RRGGBB hex for button borders on colored fills. */
function darkenHex(hex: string, factor = 0.74): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export default function RunDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = normalizeRouteParam(params.id);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun
    ? FUN_RUN_MISSION
    : findMissionById(weekMissions, id);
  const defaultActivityMode = useUserStore(
    (s) => s.profile?.defaultActivityMode ?? 'cycle',
  );
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);

  const levelAccentColor = useMemo(() => {
    const displayXp = getDisplayXpTotal({ xp, runHistory });
    const displayLevelXp = getDisplayXpWithStartingLevelOffset(
      displayXp,
      profile?.startingClassLevel,
    );
    return getLevelInfo(displayLevelXp).accentColor;
  }, [xp, runHistory, profile?.startingClassLevel]);

  const ctaNeonBg = colors.earthGreen;
  const ctaNeonBorder = darkenHex(ctaNeonBg);

  const [activityMode, setActivityMode] =
    useState<ActivityMode>(defaultActivityMode);

  const resolvedActivityMode = useMemo((): ActivityMode => {
    if (!mission || isFreeRun) return activityMode;
    if (mission.status !== 'completed') return activityMode;
    const latest = [...runHistory]
      .filter((r) => r.missionId === mission.id)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    return latest?.activityMode ?? defaultActivityMode;
  }, [mission, isFreeRun, runHistory, activityMode, defaultActivityMode]);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Mission data not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Return to base</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = mission.status === 'completed';

  const targetDistance =
    resolvedActivityMode === 'cycle'
      ? mission.targetCyclingDistanceKm
      : mission.targetDistanceKm;
  const targetDuration =
    resolvedActivityMode === 'cycle'
      ? mission.targetCyclingDurationMin
      : mission.targetDurationMin;

  const handleStartMission = () => {
    void logEvent(Events.MISSION_STARTED, { type: activityMode });
    router.push({
      pathname: '/run/active',
      params: { id: mission.id, activityMode },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ─── Dark industrial header ────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name="close"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{stripEmojis(mission.title)}</Text>
          <Text style={styles.heroSubtitle}>
            {stripEmojis(mission.subtitle)}
          </Text>
        </View>
      </View>

      {/* ─── Scrollable body ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Activity mode selector — hidden for free run */}
        {!isFreeRun && (
          <View
            style={[
              styles.modeSelector,
              isCompleted && styles.modeSelectorReadonly,
            ]}
            pointerEvents={isCompleted ? 'none' : 'auto'}
          >
            <TouchableOpacity
              style={[
                styles.modeTab,
                resolvedActivityMode === 'run' &&
                  (isCompleted ? styles.modeTabLockedIn : styles.modeTabActive),
              ]}
              onPress={() => setActivityMode('run')}
              activeOpacity={isCompleted ? 1 : 0.8}
              disabled={isCompleted}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCompleted, selected: resolvedActivityMode === 'run' }}
            >
              <MaterialIcons
                name="directions-run"
                size={18}
                color={
                  resolvedActivityMode === 'run'
                    ? colors.textPrimary
                    : colors.textTertiary
                }
              />
              <Text
                style={[
                  styles.modeTabLabel,
                  resolvedActivityMode === 'run' && styles.modeTabLabelActive,
                ]}
              >
                RUN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeTab,
                resolvedActivityMode === 'cycle' &&
                  (isCompleted ? styles.modeTabLockedIn : styles.modeTabActive),
              ]}
              onPress={() => setActivityMode('cycle')}
              activeOpacity={isCompleted ? 1 : 0.8}
              disabled={isCompleted}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCompleted, selected: resolvedActivityMode === 'cycle' }}
            >
              <MaterialIcons
                name="directions-bike"
                size={18}
                color={
                  resolvedActivityMode === 'cycle'
                    ? colors.textPrimary
                    : colors.textTertiary
                }
              />
              <Text
                style={[
                  styles.modeTabLabel,
                  resolvedActivityMode === 'cycle' && styles.modeTabLabelActive,
                ]}
              >
                CYCLE
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row — hidden for free run (no targets) */}
        {!isFreeRun && (
          <View style={styles.statsRow}>
            <StatCard
              icon={
                resolvedActivityMode === 'cycle'
                  ? 'directions-bike'
                  : 'directions-run'
              }
              label="Distance"
              value={formatDistance(targetDistance)}
            />
            <StatCard
              icon="timer"
              label="Duration"
              value={`~${formatDuration(targetDuration)}`}
            />
          </View>
        )}

        {/* Mission reward — hidden for free run */}
        {!isFreeRun ? (
          <Card accentTop={colors.border} style={styles.xpCard}>
            <View style={styles.xpRow}>
              <View style={styles.xpLeft}>
                <Text style={styles.xpTitle}>Mission Reward</Text>
                <Text style={styles.xpSub}>Streak bonus may increase XP</Text>
              </View>
              <XPBadge
                xp={mission.xpReward}
                size="lg"
                accentColor={levelAccentColor}
              />
            </View>
          </Card>
        ) : (
          <Card accentTop={colors.border} style={styles.xpCard}>
            <View style={styles.xpRow}>
              <MaterialIcons
                name="self-improvement"
                size={24}
                color={colors.textSecondary}
              />
              <View style={styles.xpLeft}>
                <Text style={styles.xpTitle}>No XP Reward</Text>
                <Text style={styles.xpSub}>
                  Run for the joy of it. No targets, no pressure.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Briefing */}
        <Card accentTop={colors.border} style={styles.descCard}>
          <Text style={styles.descTitle}>
            {isFreeRun ? 'Field Note' : 'Mission Briefing'}
          </Text>
          <Text style={styles.descText}>{mission.description}</Text>
        </Card>

        {/* CTA */}
        {isCompleted ? (
          <View style={styles.completedState}>
            <MaterialIcons
              name="check-circle"
              size={24}
              color={colors.textSecondary}
            />
            <Text style={styles.completedText}>Mission Completed</Text>
          </View>
        ) : (
          <Button
            label={
              isFreeRun
                ? 'Start Free Run'
                : activityMode === 'cycle'
                  ? 'Start Cycling'
                  : 'Start Mission'
            }
            icon={
              isFreeRun
                ? 'directions-run'
                : activityMode === 'cycle'
                  ? 'directions-bike'
                  : 'directions-run'
            }
            onPress={handleStartMission}
            fullWidth
            style={{
              ...styles.cta,
              backgroundColor: ctaNeonBg,
              borderColor: ctaNeonBorder,
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconBlock}>
        <MaterialIcons
          name={icon as any}
          size={20}
          color={colors.textSecondary}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  // Header
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  } as ViewStyle,
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  } as ViewStyle,
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  heroContent: {
    gap: spacing.sm,
  } as ViewStyle,
  heroTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    lineHeight: 36,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  heroSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'left',
  } as TextStyle,

  // Scroll body
  scroll: { flex: 1 } as ViewStyle,
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.huge,
  } as ViewStyle,

  // Activity mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  } as ViewStyle,
  modeSelectorReadonly: {
    opacity: 0.92,
  } as ViewStyle,
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  } as ViewStyle,
  modeTabLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  modeTabActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.earthGreen,
  } as ViewStyle,
  /** Completed mission: show chosen mode without neon (not interactive). */
  modeTabLockedIn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  modeTabLabelActive: {
    color: colors.textPrimary,
  } as TextStyle,

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  } as ViewStyle,
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  } as ViewStyle,
  statIconBlock: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  } as TextStyle,
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,

  // XP card
  xpCard: { paddingTop: spacing.xl + 3 } as ViewStyle,
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  xpLeft: { gap: spacing.xs } as ViewStyle,
  xpTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  xpSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Briefing
  descCard: { gap: spacing.md } as ViewStyle,
  descTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  descText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  } as TextStyle,

  // CTA
  cta: { marginTop: spacing.sm } as ViewStyle,
  completedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  } as ViewStyle,
  completedText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
  } as TextStyle,

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  } as ViewStyle,
  notFoundText: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  } as TextStyle,
  backLink: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
});
