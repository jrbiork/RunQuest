import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Mission, CompletedRun } from '../../types';
import { MissionNode } from './MissionNode';
import { useUserStore } from '../../store/userStore';
import { useMissionsStore } from '../../store/missionsStore';
import { getDisplayXpTotal } from '../../utils/displayXp';
import { SCAVENGER_LEVEL_COUNT } from '../../utils/xpCalculator';
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  radii,
} from '../../constants/theme';

interface JourneyPathProps {
  missions: Mission[];
  allComplete: boolean;
  /** Current scavenger level accent — mission icons on path. */
  levelAccent: string;
}

export function JourneyPath({
  missions,
  allComplete,
  levelAccent,
}: JourneyPathProps) {
  const runHistory = useUserStore((s) => s.runHistory);
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const missionSetClassLevel = useMissionsStore((s) => s.missionSetClassLevel);

  const retryMission = useMissionsStore((s) => s.retryMission);
  const generateMissionsFromProfile = useMissionsStore(
    (s) => s.generateMissionsFromProfile,
  );

  const completionPulse = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!allComplete) {
      completionPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(completionPulse, {
          toValue: 1.06,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(completionPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [allComplete, completionPulse]);

  // Build a quick lookup: missionId → most-recent CompletedRun
  const completedRunByMission = React.useMemo(() => {
    const map = new Map<string, CompletedRun>();
    for (const run of runHistory) {
      const existing = map.get(run.missionId);
      if (!existing || run.completedAt > existing.completedAt) {
        map.set(run.missionId, run);
      }
    }
    return map;
  }, [runHistory]);

  const missionIdsWithAttempt = React.useMemo(() => {
    const ids = new Set<string>();
    for (const run of runHistory) {
      ids.add(run.missionId);
    }
    return ids;
  }, [runHistory]);

  if (missions.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="map" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No missions yet</Text>
        <Text style={styles.emptyText}>
          Complete onboarding to unlock your mission path.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allComplete &&
        missionSetClassLevel != null &&
        missionSetClassLevel < SCAVENGER_LEVEL_COUNT && (
          <Animated.View
            style={[
              styles.completeBanner,
              { transform: [{ scale: completionPulse }] },
            ]}
          >
            <MaterialIcons
              name="celebration"
              size={24}
              color={colors.textSecondary}
            />
            <View style={styles.completeBannerContent}>
              <Text style={styles.completeBannerTitle}>Level complete</Text>
              <Text style={styles.completeBannerSub}>
                Great work. Continue to your next mission level.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.nextSetButton}
              onPress={() => {
                if (!profile) return;
                const totalXp = getDisplayXpTotal({ xp, runHistory });
                const nextLevel = Math.min(
                  SCAVENGER_LEVEL_COUNT,
                  missionSetClassLevel + 1,
                );
                generateMissionsFromProfile(profile, totalXp, nextLevel);
              }}
            >
              <Text style={styles.nextSetButtonText}>Next level</Text>
              <MaterialIcons
                name="arrow-forward"
                size={14}
                color={colors.background}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

      <View style={styles.path}>
        {missions.map((mission, idx) => (
          <MissionNode
            key={mission.id}
            mission={mission}
            completedRun={completedRunByMission.get(mission.id)}
            hasMissionAttempts={missionIdsWithAttempt.has(mission.id)}
            isLast={idx === missions.length - 1}
            levelAccent={levelAccent}
            onPress={() => {
              if (mission.status !== 'locked') {
                router.push({
                  pathname: '/run/[id]',
                  params: { id: mission.id },
                });
              }
            }}
            onViewMissionRuns={() => {
              const run = completedRunByMission.get(mission.id);
              if (run) {
                router.push({
                  pathname: '/run/history',
                  params: {
                    missionId: mission.id,
                    completedAt: encodeURIComponent(run.completedAt),
                  },
                });
              } else {
                router.push({
                  pathname: '/run/mission-runs',
                  params: { missionId: mission.id },
                });
              }
            }}
            onRetry={
              mission.status === 'aborted'
                ? () => retryMission(mission.id)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  } as ViewStyle,
  path: {
    gap: spacing.xl,
  } as ViewStyle,
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: spacing.md,
  } as ViewStyle,
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  } as TextStyle,
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  } as ViewStyle,
  completeBannerContent: {
    flex: 1,
  } as ViewStyle,
  completeBannerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  completeBannerSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  nextSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  } as ViewStyle,
  nextSetButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
});
