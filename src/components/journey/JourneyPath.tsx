import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import type { Mission, CompletedRun } from '../../types';
import { MissionNode } from './MissionNode';
import { useUserStore } from '../../store/userStore';
import { useMissionsStore } from '../../store/missionsStore';
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
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const campaignMissions = useMissionsStore((s) => s.campaignMissions);

  const retryMission = useMissionsStore((s) => s.retryMission);

  const shareRef = useRef<ViewShot>(null);
  const [sharingMissionId, setSharingMissionId] = useState<string | null>(null);

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
    // Let the off-screen card render before capturing
    await new Promise((r) => setTimeout(r, 80));
    await shareCard(shareRef);
    setSharingMissionId(null);
  }, []);

  const sharingRun = sharingMissionId ? completedRunByMission.get(sharingMissionId) : undefined;
  const sharingMission = sharingMissionId
    ? findMissionById(campaignMissions, weekMissions, sharingMissionId)
    : undefined;

  if (missions.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="map" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No missions yet</Text>
        <Text style={styles.emptyText}>Complete onboarding to unlock your weekly mission path.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allComplete && (
        <View style={styles.completeBanner}>
          <MaterialIcons name="celebration" size={32} color={colors.primary} />
          <View>
            <Text style={styles.completeBannerTitle}>Week complete!</Text>
            <Text style={styles.completeBannerSub}>You crushed every mission. Rest up — new missions drop Monday.</Text>
          </View>
        </View>
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
              mission.status === 'failed' || mission.status === 'aborted'
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
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  } as ViewStyle,
  completeBannerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  } as TextStyle,
  completeBannerSub: {
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    maxWidth: 240,
    lineHeight: 18,
  } as TextStyle,
});
