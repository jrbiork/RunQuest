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
import { MISSION_TEMPLATES, FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import type { ActivityMode } from '../../src/types';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun ? FUN_RUN_MISSION : weekMissions.find((m) => m.id === id);
  const [activityMode, setActivityMode] = useState<ActivityMode>('run');

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
  const template = MISSION_TEMPLATES[mission.type];
  const motivational = template.motivationalFraming[
    Math.floor(Math.random() * template.motivationalFraming.length)
  ] as string;

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
      <View style={[styles.hero, { borderBottomColor: config.color }]}>
        {/* Close + type pill row */}
        <View style={styles.heroTopRow}>
          <View style={[styles.typePill, { borderColor: config.color }]}>
            <MaterialIcons name={config.icon as any} size={12} color={config.color} />
            <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{mission.title}</Text>
          <Text style={styles.heroSubtitle}>{mission.subtitle}</Text>
        </View>
      </View>

      {/* ─── Scrollable body ─────────────────────────────────────────── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Activity mode selector — hidden for free run */}
        {!isFreeRun && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeTab, activityMode === 'run' && styles.modeTabActive]}
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
              style={[styles.modeTab, activityMode === 'cycle' && styles.modeTabActive]}
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
              color={config.color}
            />
            <StatCard
              icon="timer"
              label="Duration"
              value={`~${formatDuration(targetDuration)}`}
              color={config.color}
            />
          </View>
        )}

        {/* Mission reward — hidden for free run */}
        {!isFreeRun ? (
          <Card accentTop={colors.ochre} style={styles.xpCard}>
            <View style={styles.xpRow}>
              <View style={styles.xpLeft}>
                <Text style={styles.xpTitle}>Mission Reward</Text>
                <Text style={styles.xpSub}>Streak bonus may increase XP</Text>
              </View>
              <XPBadge xp={mission.xpReward} size="lg" />
            </View>
          </Card>
        ) : (
          <Card accentTop={colors.border} style={styles.xpCard}>
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
        <Card accentTop={colors.border} style={styles.descCard}>
          <Text style={styles.descTitle}>{isFreeRun ? 'Field Note' : 'Mission Briefing'}</Text>
          <Text style={styles.descText}>{mission.description}</Text>
        </Card>

        {/* Intelligence / motivational framing — hidden for free run */}
        {!isFreeRun && (
          <View style={styles.intelCard}>
            <View style={styles.intelHeader}>
              <MaterialIcons name="radio" size={14} color={colors.orange} />
              <Text style={styles.intelHeaderText}>Intel Received</Text>
            </View>
            <Text style={styles.intelQuote}>"{motivational}"</Text>
          </View>
        )}

        {/* CTA */}
        {isCompleted ? (
          <View style={styles.completedState}>
            <MaterialIcons name="check-circle" size={26} color={colors.primary} />
            <Text style={styles.completedText}>Mission Completed</Text>
          </View>
        ) : (
          <Button
            label={isFreeRun ? 'Start Free Run' : activityMode === 'cycle' ? 'Start Cycling' : 'Start Mission'}
            icon={isFreeRun ? 'directions-run' : activityMode === 'cycle' ? 'directions-bike' : 'directions-run'}
            onPress={handleStartMission}
            fullWidth
            style={styles.cta}
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
  modeTabActive: {
    backgroundColor: colors.primary,
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

  // Intel card
  intelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.orange,
    padding: spacing.xl,
    gap: spacing.md,
  } as ViewStyle,
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  intelHeaderText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  intelQuote: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
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
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  } as ViewStyle,
  completedText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
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
