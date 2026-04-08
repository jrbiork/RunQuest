import React, { useRef, useState, useCallback } from 'react';
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
import ViewShot from 'react-native-view-shot';
import type { Mission, CompletedRun } from '../../types';
import { MissionNode } from './MissionNode';
import { useUserStore } from '../../store/userStore';
import { useMissionsStore } from '../../store/missionsStore';
import { getDisplayXpTotal } from '../../utils/displayXp';
import { SCAVENGER_LEVEL_COUNT } from '../../utils/xpCalculator';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../constants/theme';
import RunShareCard from '../share/RunShareCard';
import { shareCard } from '../../services/shareService';
import { findMissionById } from '../../utils/missionLookup';
import { getStreakDayIndex0 } from '../../utils/streakDisplay';


interface JourneyPathProps {
  missions: Mission[];
  allComplete: boolean;
}

export function JourneyPath({ missions, allComplete }: JourneyPathProps) {
  const runHistory = useUserStore((s) => s.runHistory);
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const missionSetClassLevel = useMissionsStore((s) => s.missionSetClassLevel);

  const retryMission = useMissionsStore((s) => s.retryMission);
  const generateMissionsFromProfile = useMissionsStore((s) => s.generateMissionsFromProfile);

  const shareRef = useRef<ViewShot>(null);
  const [sharingMissionId, setSharingMissionId] = useState<string | null>(null);
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

  const handleShare = useCallback(async (missionId: string) => {
    setSharingMissionId(missionId);
    const run = completedRunByMission.get(missionId);
    const hasPath = run?.path && run.path.length >= 2;
    await shareCard(shareRef, { delayMs: hasPath ? 550 : 100 });
    setSharingMissionId(null);
  }, [completedRunByMission]);

  const sharingRun = sharingMissionId ? completedRunByMission.get(sharingMissionId) : undefined;
  const sharingMission = sharingMissionId
    ? findMissionById(weekMissions, sharingMissionId)
    : undefined;

  if (missions.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="map" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No missions yet</Text>
        <Text style={styles.emptyText}>Complete onboarding to unlock your mission path.</Text>
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
          <MaterialIcons name="celebration" size={24} color={colors.textSecondary} />
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
            <MaterialIcons name="arrow-forward" size={14} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.path}>
        {missions.map((mission, idx) => (
          <MissionNode
            key={mission.id}
            mission={mission}
            completedRun={completedRunByMission.get(mission.id)}
            isLast={idx === missions.length - 1}
            onPress={() => {
              if (mission.status !== 'locked') {
                router.push({ pathname: '/run/[id]', params: { id: mission.id } });
              }
            }}
            onShare={
              mission.status === 'completed'
                ? () => handleShare(mission.id)
                : undefined
            }
            onRetry={
              mission.status === 'aborted'
                ? () => retryMission(mission.id)
                : undefined
            }
          />
        ))}
      </View>

      {/* Off-screen share card — rendered only while a share is in progress */}
      {sharingRun && sharingMission && (
        <View style={styles.offscreen} pointerEvents="none">
          <RunShareCard
            ref={shareRef}
            distanceKm={sharingRun.distanceKm}
            durationMin={sharingRun.durationMin}
            xpEarned={sharingRun.xpEarned}
            streakDay={getStreakDayIndex0(sharingRun, runHistory)}
            missionType={sharingMission.type}
            path={sharingRun.path}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  } as ViewStyle,
  offscreen: {
    position: 'absolute',
    top: 0,
    left: -9999,
    opacity: 0,
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
