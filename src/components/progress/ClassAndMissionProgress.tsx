import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useMissionsStore, selectCompletedCount } from '../../store/missionsStore';
import { ProgressBar } from '../ui/ProgressBar';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../constants/theme';
import {
  getDisplayXpWithStartingLevelOffset,
  getLevelInfo,
  getXpRemainingToNextLevel,
  LEVEL_CLASS_TITLES,
  SCAVENGER_LEVEL_COUNT,
} from '../../utils/xpCalculator';
import { getDisplayXpTotal } from '../../utils/displayXp';

/**
 * Level XP ring + mission queue completion — shared by profile and run complete.
 */
export function ClassAndMissionProgress() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completedCount = useMissionsStore(selectCompletedCount);
  const generateMissionsFromProfile = useMissionsStore(
    (s) => s.generateMissionsFromProfile,
  );

  useEffect(() => {
    if (!profile) return;
    if (weekMissions.length === 0) {
      generateMissionsFromProfile(profile, useUserStore.getState().xp);
    }
  }, [profile, weekMissions.length, generateMissionsFromProfile]);

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
  const xpRemaining = useMemo(
    () => getXpRemainingToNextLevel(displayLevelXp),
    [displayLevelXp],
  );
  const nextTitle =
    levelInfo.level < SCAVENGER_LEVEL_COUNT
      ? LEVEL_CLASS_TITLES[levelInfo.level]
      : null;
  const classRingProgress = levelInfo.progress;

  const totalMissions = weekMissions.length;
  const weekProgress =
    totalMissions > 0 ? completedCount / totalMissions : 0;

  return (
    <View style={styles.wrap}>
      <View style={[styles.classCard, { borderColor: levelInfo.accentColor }]}>
        <View style={styles.classHeader}>
          <View style={styles.classHeaderLeft}>
            <MaterialIcons
              name="military-tech"
              size={18}
              color={levelInfo.accentColor}
            />
            <Text style={styles.classTitle}>Level progress</Text>
          </View>
          {nextTitle && xpRemaining > 0 ? (
            <Text style={styles.classCount}>
              +{xpRemaining} XP → {nextTitle}
            </Text>
          ) : (
            <Text style={styles.classCount}>Max level</Text>
          )}
        </View>
        <ProgressBar
          progress={classRingProgress}
          color={levelInfo.accentColor}
          backgroundColor={`${levelInfo.accentColor}22`}
          height={8}
        />
        <Text style={styles.classSub}>{displayXp.toLocaleString()} total XP</Text>
      </View>

      {totalMissions > 0 && (
        <View style={styles.queueCard}>
          <View style={styles.queueHeader}>
            <View style={styles.queueHeaderLeft}>
              <MaterialIcons name="route" size={18} color={colors.primary} />
              <Text style={styles.queueTitle}>Mission queue</Text>
            </View>
            <Text style={styles.queueCount}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  } as ViewStyle,
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  classHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  classTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  classCount: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  classSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  queueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  queueTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  queueCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  } as TextStyle,
});
