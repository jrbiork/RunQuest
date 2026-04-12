import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompletedRun, Mission } from '../../types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../constants/theme';
import { formatDistance } from '../../utils/xpCalculator';
import { resolveMissionDisplayTitle } from '../../utils/missionLookup';
import { resolveOutcome } from '../../utils/runOutcome';
import { SortieOutcomeBadge } from '../ui/SortieOutcomeBadge';

type Props = {
  visible: boolean;
  onClose: () => void;
  run: CompletedRun | null;
  mission: Mission | undefined;
  personaId: import('../../types').PersonaId | null | undefined;
};

export function RunDetailsModal({
  visible,
  onClose,
  run,
  mission,
  personaId,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!run) return null;

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.safe}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons
              name="close"
              size={24}
              color={colors.textSecondary}
            />
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
          <View style={styles.metaRow}>
            <SortieOutcomeBadge outcome={outcome} />
            <Text style={styles.metaDate}>
              {dateStr} · {timeStr}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {formatDistance(run.distanceKm)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>
                {Math.round(run.durationMin)} min
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>XP</Text>
              <Text style={styles.statValue}>+{run.xpEarned}</Text>
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
                scrollEnabled={false}
                zoomEnabled={false}
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
            <Text style={styles.noMap}>No GPS path saved for this run.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background } as ViewStyle,
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
  mapWrap: { gap: spacing.sm } as ViewStyle,
  mapLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
  } as TextStyle,
  map: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
  } as ViewStyle,
  noMap: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  } as TextStyle,
});
