import { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore, selectCompletedCount } from '../../src/store/missionsStore';
import { JourneyPath } from '../../src/components/journey/JourneyPath';
import { colors, spacing, fontSizes, fontWeights } from '../../src/constants/theme';
import {
  getDisplayXpWithStartingLevelOffset,
  getLevelInfo,
} from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';

export default function JourneyScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completedCount = useMissionsStore(selectCompletedCount);
  const generateMissionsFromProfile = useMissionsStore((s) => s.generateMissionsFromProfile);

  const displayXp = useMemo(
    () => getDisplayXpTotal({ xp, runHistory }),
    [xp, runHistory],
  );
  const displayLevelXp = useMemo(
    () =>
      getDisplayXpWithStartingLevelOffset(
        displayXp,
        profile?.startingClassLevel,
      ),
    [displayXp, profile?.startingClassLevel],
  );
  const levelInfo = useMemo(() => getLevelInfo(displayLevelXp), [displayLevelXp]);

  const missions = weekMissions;
  const allComplete = missions.length > 0 && missions.every((m) => m.status === 'completed');
  const totalMissions = missions.length;

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
            <Text
              style={[styles.classBadgeText, { color: levelInfo.accentColor }]}
            >
              {levelInfo.title}
            </Text>
          </View>
          <Text style={styles.title}>MISSION PATH</Text>
          <Text style={styles.subtitle}>
            {allComplete
              ? 'ALL MISSIONS COMPLETE IN THIS SET'
              : totalMissions === 0
                ? 'Complete onboarding to receive missions'
                : `${completedCount} / ${totalMissions} MISSIONS COMPLETED`}
          </Text>
        </View>

        {totalMissions > 0 && (
          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.missionsSectionTitle}>Missions</Text>
            </View>
          </View>
        )}

        <JourneyPath missions={missions} allComplete={allComplete} />
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
    backgroundColor: colors.border,
    borderRadius: 2,
  } as ViewStyle,
  missionsSectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
});
