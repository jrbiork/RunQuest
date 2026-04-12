import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo } from 'react';
import {
  buildXpTagAccentByRunKey,
  runHistoryEntryKey,
} from '../../src/utils/runXpAccent';
import { getDisplayXpWithStartingLevelOffset, getLevelInfo } from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { RunHistoryDetailView } from '../../src/components/run/RunHistoryDetailView';
import { normalizeRouteParam, resolveMissionForHistory } from '../../src/utils/missionLookup';
import { colors, fontSizes, spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import type { ActivityMode, CompletedRun } from '../../src/types';

export default function RunHistoryScreen() {
  const params = useLocalSearchParams<{
    missionId: string;
    completedAt: string;
  }>();
  const missionId = normalizeRouteParam(params.missionId);
  const completedAtRaw = normalizeRouteParam(params.completedAt);
  const completedAt = completedAtRaw
    ? decodeURIComponent(completedAtRaw)
    : '';

  const runHistory = useUserStore((s) => s.runHistory);
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const profilePersona = useUserStore((s) => s.profile?.personaId ?? s.personaId);
  const defaultActivity = useUserStore(
    (s) => s.profile?.defaultActivityMode ?? 'run',
  );
  const weekMissions = useMissionsStore((s) => s.weekMissions);

  const xpAccentByRunKey = useMemo(
    () => buildXpTagAccentByRunKey(runHistory, profile?.startingClassLevel),
    [runHistory, profile?.startingClassLevel],
  );

  const levelAccentFallback = useMemo(() => {
    const displayXp = getDisplayXpTotal({ xp, runHistory });
    const displayLevelXp = getDisplayXpWithStartingLevelOffset(
      displayXp,
      profile?.startingClassLevel,
    );
    return getLevelInfo(displayLevelXp).accentColor;
  }, [xp, runHistory, profile?.startingClassLevel]);

  const run = useMemo((): CompletedRun | null => {
    if (!missionId || !completedAt) return null;
    return (
      runHistory.find(
        (r) => r.missionId === missionId && r.completedAt === completedAt,
      ) ?? null
    );
  }, [runHistory, missionId, completedAt]);

  const mission = useMemo(() => {
    if (!missionId) return undefined;
    return resolveMissionForHistory(missionId, weekMissions, profilePersona);
  }, [missionId, weekMissions, profilePersona]);

  const activityMode: ActivityMode =
    run?.activityMode ?? defaultActivity;

  if (!run) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission not found.</Text>
          <Button label="Back" onPress={() => router.back()} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const xpTagAccentColor =
    xpAccentByRunKey.get(runHistoryEntryKey(run)) ?? levelAccentFallback;

  return (
    <View style={styles.safe}>
      <RunHistoryDetailView
        run={run}
        mission={mission}
        personaId={profilePersona}
        activityMode={activityMode}
        onClose={() => router.back()}
        xpTagAccentColor={xpTagAccentColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  } as ViewStyle,
  errorText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
});
