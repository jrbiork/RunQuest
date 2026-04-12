import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import {
  normalizeRouteParam,
  resolveMissionForHistory,
} from '../../src/utils/missionLookup';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../src/constants/theme';
import { formatDistance } from '../../src/utils/xpCalculator';
import { resolveOutcome } from '../../src/utils/runOutcome';
import { SortieOutcomeBadge } from '../../src/components/ui/SortieOutcomeBadge';

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MissionRunsScreen() {
  const params = useLocalSearchParams<{ missionId: string }>();
  const missionId = normalizeRouteParam(params.missionId);
  const runHistory = useUserStore((s) => s.runHistory);
  const profilePersona = useUserStore((s) => s.profile?.personaId ?? s.personaId);
  const weekMissions = useMissionsStore((s) => s.weekMissions);

  const mission = useMemo(() => {
    if (!missionId) return undefined;
    return resolveMissionForHistory(missionId, weekMissions, profilePersona);
  }, [missionId, weekMissions, profilePersona]);

  const runs = useMemo(() => {
    if (!missionId) return [];
    return [...runHistory]
      .filter((r) => r.missionId === missionId)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
  }, [runHistory, missionId]);

  const title = mission?.title ?? 'Mission';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerLabel}>Activity log</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>

      {runs.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="insights" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No runs yet</Text>
          <Text style={styles.emptySub}>
            Completed, partial, and aborted attempts for this mission will appear
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(r) => `${r.missionId}-${r.completedAt}`}
          contentContainerStyle={styles.list}
          renderItem={({ item: run }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/run/history',
                  params: {
                    missionId: run.missionId,
                    completedAt: encodeURIComponent(run.completedAt),
                  },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.rowTop}>
                <Text style={styles.rowDate}>{formatRunDate(run.completedAt)}</Text>
                <SortieOutcomeBadge outcome={resolveOutcome(run)} />
              </View>
              <View style={styles.rowMeta}>
                <MaterialIcons
                  name={
                    (run.activityMode ?? 'run') === 'cycle'
                      ? 'directions-bike'
                      : 'directions-run'
                  }
                  size={16}
                  color={colors.textTertiary}
                />
                <Text style={styles.rowStats}>
                  {formatDistance(run.distanceKm)} · {formatDuration(run.durationMin)}
                  {run.xpEarned > 0 ? ` · +${run.xpEarned} XP` : ''}
                </Text>
              </View>
              <Text style={styles.rowHint}>Tap for details</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  backBtn: {
    paddingTop: spacing.xs,
  } as ViewStyle,
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  } as ViewStyle,
  headerLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  } as ViewStyle,
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  } as ViewStyle,
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  rowDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    flex: 1,
  } as TextStyle,
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  rowStats: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
  } as TextStyle,
  rowHint: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  } as ViewStyle,
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  emptySub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
});
