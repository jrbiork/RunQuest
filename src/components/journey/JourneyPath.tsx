import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Mission, CompletedRun } from '../../types';
import { MissionNode } from './MissionNode';
import { useUserStore } from '../../store/userStore';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../constants/theme';

interface JourneyPathProps {
  missions: Mission[];
  allComplete: boolean;
}

export function JourneyPath({ missions, allComplete }: JourneyPathProps) {
  const runHistory = useUserStore((s) => s.runHistory);

  // Build a quick lookup: missionId → most-recent CompletedRun
  const completedRunByMission = React.useMemo(() => {
    const map = new Map<string, CompletedRun>();
    for (const run of runHistory) {
      // Keep the latest entry for each mission
      const existing = map.get(run.missionId);
      if (!existing || run.completedAt > existing.completedAt) {
        map.set(run.missionId, run);
      }
    }
    return map;
  }, [runHistory]);

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
    gap: spacing.sm,
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
