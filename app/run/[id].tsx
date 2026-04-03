import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMissionsStore } from '../../src/store/missionsStore';
import { XPBadge } from '../../src/components/ui/XPBadge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../src/constants/theme';
import { formatDistance, formatDuration } from '../../src/utils/xpCalculator';
import { FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import { findMissionById, normalizeRouteParam } from '../../src/utils/missionLookup';
import { stripEmojis } from '../../src/utils/stripEmojis';
import { useUserStore } from '../../src/store/userStore';
import type { ActivityMode } from '../../src/types';

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
  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun ? FUN_RUN_MISSION : findMissionById(campaignMissions, weekMissions, id);
  const defaultActivityMode = useUserStore((s) => s.profile?.defaultActivityMode ?? 'cycle');
  const [activityMode, setActivityMode] = useState<ActivityMode>(defaultActivityMode);

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

  const config = missionConfig[mission.type];
  const accent = config.color;
  const accentBtnBorder = darkenHex(accent);

  const isCompleted = mission.status === 'completed';

  const targetDistance = activityMode === 'cycle'
    ? mission.targetCyclingDistanceKm
    : mission.targetDistanceKm;
  const targetDuration = activityMode === 'cycle'
    ? mission.targetCyclingDurationMin
    : mission.targetDurationMin;

  const handleStartMission = () => {
    router.push({ pathname: '/run/active', params: { id: mission.id, activityMode } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ─── Dark industrial header ────────────────────────────────── */}
      <View style={[styles.hero, { borderBottomColor: accent }]}>
        {/* Close + type pill row */}
        <View style={styles.heroTopRow}>
          <View style={[styles.typePill, { borderColor: accent }]}>
            <MaterialIcons name={config.icon as any} size={12} color={accent} />
            <Text style={[styles.typeLabel, { color: accent }]}>{config.label}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{stripEmojis(mission.title)}</Text>
          <Text style={styles.heroSubtitle}>{stripEmojis(mission.subtitle)}</Text>
        </View>
      </View>

      {/* ─── Scrollable body ─────────────────────────────────────────── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Activity mode selector — hidden for free run */}
        {!isFreeRun && (
          <View style={[styles.modeSelector, { borderColor: `${accent}55`, backgroundColor: config.bgColor }]}>
            <TouchableOpacity
              style={[styles.modeTab, activityMode === 'run' && { backgroundColor: accent }]}
              onPress={() => setActivityMode('run')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="directions-run"
                size={18}
                color={activityMode === 'run' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.modeTabLabel, activityMode === 'run' && styles.modeTabLabelActive]}>
                RUN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, activityMode === 'cycle' && { backgroundColor: accent }]}
              onPress={() => setActivityMode('cycle')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="directions-bike"
                size={18}
                color={activityMode === 'cycle' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.modeTabLabel, activityMode === 'cycle' && styles.modeTabLabelActive]}>
                CYCLE
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row — hidden for free run (no targets) */}
        {!isFreeRun && (
          <View style={styles.statsRow}>
            <StatCard
              icon={activityMode === 'cycle' ? 'directions-bike' : 'directions-run'}
              label="Distance"
              value={formatDistance(targetDistance)}
              color={accent}
            />
            <StatCard
              icon="timer"
              label="Duration"
              value={`~${formatDuration(targetDuration)}`}
              color={accent}
            />
          </View>
        )}

        {/* Mission reward — hidden for free run */}
        {!isFreeRun ? (
          <Card accentTop={accent} style={styles.xpCard}>
            <View style={styles.xpRow}>
              <View style={styles.xpLeft}>
                <Text style={styles.xpTitle}>Mission Reward</Text>
                <Text style={styles.xpSub}>Streak bonus may increase XP</Text>
              </View>
              <XPBadge xp={mission.xpReward} size="lg" accentColor={accent} />
            </View>
          </Card>
        ) : (
          <Card accentTop={accent} style={styles.xpCard}>
            <View style={styles.xpRow}>
              <MaterialIcons name="self-improvement" size={24} color={colors.textSecondary} />
              <View style={styles.xpLeft}>
                <Text style={styles.xpTitle}>No XP Reward</Text>
                <Text style={styles.xpSub}>Run for the joy of it. No targets, no pressure.</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Briefing */}
        <Card accentTop={accent} style={styles.descCard}>
          <Text style={styles.descTitle}>{isFreeRun ? 'Field Note' : 'Mission Briefing'}</Text>
          <Text style={styles.descText}>{mission.description}</Text>
        </Card>

        {/* CTA */}
        {isCompleted ? (
          <View
            style={[
              styles.completedState,
              { backgroundColor: `${accent}18`, borderColor: accent },
            ]}
          >
            <MaterialIcons name="check-circle" size={26} color={accent} />
            <Text style={[styles.completedText, { color: accent }]}>Mission Completed</Text>
          </View>
        ) : (
          <Button
            label={isFreeRun ? 'Start Free Run' : activityMode === 'cycle' ? 'Start Cycling' : 'Start Mission'}
            icon={isFreeRun ? 'directions-run' : activityMode === 'cycle' ? 'directions-bike' : 'directions-run'}
            onPress={handleStartMission}
            fullWidth
            style={{ ...styles.cta, backgroundColor: accent, borderColor: accentBtnBorder }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <View style={[styles.statIconBlock, { backgroundColor: color + '22' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
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
    borderBottomWidth: 2,
    gap: spacing.md,
  } as ViewStyle,
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  } as ViewStyle,
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  heroSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
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
  modeTabLabelActive: {
    color: colors.textInverse,
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
  } as ViewStyle,
  completedText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
