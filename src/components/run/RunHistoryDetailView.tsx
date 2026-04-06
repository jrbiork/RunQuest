import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import type {
  ActivityMode,
  CompletedRun,
  Mission,
  PersonaId,
} from '../../types';
import { colors, spacing, radii, fontSizes, fontWeights } from '../../constants/theme';
import { formatDistance } from '../../utils/xpCalculator';
import { resolveMissionDisplayTitle } from '../../utils/missionLookup';
import { resolveOutcome } from '../../utils/runOutcome';
import { SortieOutcomeBadge } from '../ui/SortieOutcomeBadge';

function formatPace(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01) return '–';
  const paceSecPerKm = (durationMin * 60) / distanceKm;
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function targetPaceLabel(targetKm: number, targetMin: number): string {
  if (targetKm < 0.01 || targetMin <= 0) return '–';
  return formatPace(targetKm, targetMin);
}

type Props = {
  run: CompletedRun;
  mission: Mission | undefined;
  personaId: PersonaId | null | undefined;
  activityMode: ActivityMode;
  onClose: () => void;
};

export function RunHistoryDetailView({
  run,
  mission,
  personaId,
  activityMode,
  onClose,
}: Props) {
  const title = resolveMissionDisplayTitle(run.missionId, mission, personaId);
  const outcome = resolveOutcome(run);
  const when = new Date(run.completedAt);
  const dateStr = when.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = when.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const isCycle = activityMode === 'cycle';
  const targetKm = mission
    ? isCycle
      ? mission.targetCyclingDistanceKm
      : mission.targetDistanceKm
    : 0;
  const targetMin = mission
    ? isCycle
      ? mission.targetCyclingDurationMin
      : mission.targetDurationMin
    : 0;

  const coords =
    run.path?.map((p) => ({ latitude: p.latitude, longitude: p.longitude })) ??
    [];
  const hasMap = coords.length >= 2;

  let lat = 48.8566;
  let lng = 2.3522;
  if (coords.length > 0) {
    lat = coords[0]!.latitude;
    lng = coords[0]!.longitude;
  }

  const modeLabel = isCycle ? 'Cycle' : 'Run';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md },
        ]}
      >
        <Text style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialIcons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.modePill}>
          <MaterialIcons
            name={isCycle ? 'pedal-bike' : 'directions-run'}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.modePillText}>{modeLabel}</Text>
        </View>

        <View style={styles.metaRow}>
          <SortieOutcomeBadge outcome={outcome} />
          <Text style={styles.metaDate}>
            {dateStr} · {timeStr}
          </Text>
        </View>

        {mission && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Mission target</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{formatDistance(targetKm)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>
                  {targetMin > 0 ? `${Math.round(targetMin)} min` : '–'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Pace</Text>
                <Text style={styles.statValue}>
                  {targetPaceLabel(targetKm, targetMin)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Your mission</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{formatDistance(run.distanceKm)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>
                {Math.round(run.durationMin)} min
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Pace</Text>
              <Text style={styles.statValue}>
                {formatPace(run.distanceKm, run.durationMin)}
              </Text>
            </View>
          </View>
          <View style={styles.xpRow}>
            <MaterialIcons name="star" size={18} color={colors.purple} />
            <Text style={styles.xpText}>+{run.xpEarned} XP</Text>
          </View>
        </View>

        {hasMap ? (
          <View style={styles.mapWrap}>
            <Text style={styles.mapLabel}>Route</Text>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled
              zoomEnabled
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={coords}
                strokeColor={colors.primary}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                geodesic
              />
            </MapView>
          </View>
        ) : (
          <Text style={styles.noMap}>No GPS path saved for this mission.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  } as ViewStyle,
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  scroll: { flex: 1 } as ViewStyle,
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  } as ViewStyle,
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  } as ViewStyle,
  modePillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  } as ViewStyle,
  metaDate: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
  block: {
    gap: spacing.sm,
  } as ViewStyle,
  blockLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  } as ViewStyle,
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  } as ViewStyle,
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  } as TextStyle,
  statValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  } as ViewStyle,
  xpText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.purple,
  } as TextStyle,
  mapWrap: { gap: spacing.sm } as ViewStyle,
  mapLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
  } as TextStyle,
  map: {
    width: '100%',
    height: 260,
    borderRadius: radii.lg,
    overflow: 'hidden',
  } as ViewStyle,
  noMap: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  } as TextStyle,
});
