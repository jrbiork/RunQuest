import { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore, selectCompletedCount } from '../../src/store/missionsStore';
import { JourneyPath } from '../../src/components/journey/JourneyPath';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { colors, spacing, fontSizes, fontWeights, radii, shadows } from '../../src/constants/theme';
import {
  getLevelInfo,
  getXpRemainingToNextClass,
  LEVEL_CLASS_TITLES,
  SCAVENGER_LEVEL_COUNT,
} from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';

export default function JourneyScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const missionSetClassLevel = useMissionsStore((s) => s.missionSetClassLevel);
  const completedCount = useMissionsStore(selectCompletedCount);
  const generateMissionsFromProfile = useMissionsStore((s) => s.generateMissionsFromProfile);

  const displayXp = useMemo(
    () => getDisplayXpTotal({ xp, runHistory }),
    [xp, runHistory],
  );
  const levelInfo = useMemo(() => getLevelInfo(displayXp), [displayXp]);
  const xpRemaining = useMemo(() => getXpRemainingToNextClass(displayXp), [displayXp]);
  const nextTitle =
    levelInfo.level < SCAVENGER_LEVEL_COUNT
      ? LEVEL_CLASS_TITLES[levelInfo.level]
      : null;

  const missions = weekMissions;
  const allComplete = missions.length > 0 && missions.every((m) => m.status === 'completed');
  const totalMissions = missions.length;
  const weekProgress = totalMissions > 0 ? completedCount / totalMissions : 0;
  const classRingProgress = levelInfo.progress;

  useEffect(() => {
    if (!profile) return;
    if (weekMissions.length === 0) {
      generateMissionsFromProfile(profile, useUserStore.getState().xp);
    }
  }, [profile, weekMissions.length, generateMissionsFromProfile]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.classBadge}>
            <View
              style={[styles.classDot, { backgroundColor: levelInfo.accentColor }]}
            />
            <Text style={[styles.classBadgeText, { color: levelInfo.accentColor }]}>
              {levelInfo.title}
            </Text>
          </View>
          <Text style={styles.title}>MISSION PATH</Text>
          <Text style={styles.subtitle}>
            {allComplete
              ? 'ALL MISSIONS COMPLETE IN THIS SET'
              : totalMissions === 0
                ? 'Complete onboarding to receive missions'
                : `${completedCount} / ${totalMissions} MISSIONS IN QUEUE`}
          </Text>
        </View>

        {totalMissions > 0 && missionSetClassLevel != null && (
          <Text style={styles.setHint}>
            Mission set for class rank {missionSetClassLevel}. Earn XP to promote and refresh your queue.
          </Text>
        )}

        <View style={[styles.classCard, { borderColor: levelInfo.accentColor }]}>
          <View style={styles.classCardHeader}>
            <View style={styles.classCardLeft}>
              <MaterialIcons name="military-tech" size={18} color={levelInfo.accentColor} />
              <Text style={styles.classCardTitle}>Class progress</Text>
            </View>
            {nextTitle && xpRemaining > 0 ? (
              <Text style={styles.classCardCount}>
                +{xpRemaining} XP → {nextTitle}
              </Text>
            ) : (
              <Text style={styles.classCardCount}>Max class</Text>
            )}
          </View>
          <ProgressBar
            progress={classRingProgress}
            color={levelInfo.accentColor}
            backgroundColor={`${levelInfo.accentColor}22`}
            height={8}
          />
          <Text style={styles.classCardSub}>{displayXp.toLocaleString()} total XP</Text>
        </View>

        {totalMissions > 0 && (
          <View style={styles.weekCard}>
            <View style={styles.weekCardHeader}>
              <View style={styles.weekCardLeft}>
                <MaterialIcons name="route" size={18} color={colors.primary} />
                <Text style={styles.weekCardTitle}>Mission queue</Text>
              </View>
              <Text style={styles.weekCardCount}>
                {completedCount}/{totalMissions}
              </Text>
            </View>
            <ProgressBar
              progress={weekProgress}
              color={colors.primary}
              backgroundColor={colors.primaryLight}
              height={8}
            />
          </View>
        )}

        {totalMissions > 0 && (
          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.missionsSectionTitle}>Missions</Text>
            </View>
          </View>
        )}

        <JourneyPath missions={missions} allComplete={allComplete} />

        {!allComplete && totalMissions > 0 && completedCount < totalMissions && (
          <View style={styles.tip}>
            <MaterialIcons name="radio" size={16} color={colors.primary} />
            <Text style={styles.tipText}>
              Tap any active mission to view briefing and begin your sortie.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  } as ViewStyle,
  header: {
    gap: spacing.xs,
  } as ViewStyle,
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  } as ViewStyle,
  classDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  classBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  setHint: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    lineHeight: 20,
  } as TextStyle,
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  classCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  classCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  classCardCount: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  classCardSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  weekCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  weekCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  weekCardCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  } as TextStyle,
  missionsSection: {
    gap: spacing.sm,
  } as ViewStyle,
  missionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  accentBar: {
    width: 3,
    height: 16,
    backgroundColor: colors.primary,
    borderRadius: 2,
  } as ViewStyle,
  missionsSectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.primary,
    lineHeight: 18,
  } as TextStyle,
});
