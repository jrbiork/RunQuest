import { forwardRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import ViewShot from 'react-native-view-shot';
import Svg, { Polyline } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import type { GpsPoint, MissionType } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_WIDTH = 390;
const CARD_HEIGHT = 620;
const ROUTE_W = 340;
const ROUTE_H = 180;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDist(km: number): string {
  if (km >= 10) return `${km.toFixed(1)} km`;
  if (km >= 1) return `${km.toFixed(2)} km`;
  return `${Math.round(km * 1000)} m`;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatPace(distKm: number, durMin: number): string {
  if (distKm < 0.01) return '–';
  const secPerKm = (durMin * 60) / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Map mission type to a branding accent colour. */
function missionColor(type: MissionType): string {
  const MAP: Record<MissionType, string> = {
    easy: '#4CAF50',
    tempo: '#FF9800',
    long: '#2196F3',
    recovery: '#26C6DA',
    interval: '#9C27B0',
  };
  return MAP[type] ?? '#4CAF50';
}

function missionLabel(type: MissionType): string {
  const MAP: Record<MissionType, string> = {
    easy: 'Easy Run',
    tempo: 'Tempo',
    long: 'Long Run',
    recovery: 'Recovery',
    interval: 'Intervals',
  };
  return MAP[type] ?? 'Run';
}

/** Normalise GPS points to a [0,1] bounding box and scale to the SVG canvas. */
function buildPolylinePoints(path: GpsPoint[], w: number, h: number): string {
  if (path.length < 2) return '';
  const lats = path.map((p) => p.latitude);
  const lngs = path.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const rangeX = maxLng - minLng || 1;
  const rangeY = maxLat - minLat || 1;

  // Preserve aspect ratio with padding
  const pad = 20;
  const scale = Math.min((w - pad * 2) / rangeX, (h - pad * 2) / rangeY);
  const offX = pad + ((w - pad * 2) - rangeX * scale) / 2;
  const offY = pad + ((h - pad * 2) - rangeY * scale) / 2;

  return path
    .map((p) => {
      const x = offX + (p.longitude - minLng) * scale;
      // Flip Y: higher latitude = lower on screen
      const y = h - (offY + (p.latitude - minLat) * scale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={sc.statBlock}>
      <Text style={[sc.statValue, { color: accent }]}>{value}</Text>
      <Text style={sc.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface RunShareCardProps {
  distanceKm: number;
  durationMin: number;
  xpEarned: number;
  streakDay: number;
  missionType: MissionType;
  path?: GpsPoint[];
}

const RunShareCard = forwardRef<ViewShot, RunShareCardProps>(
  ({ distanceKm, durationMin, xpEarned, streakDay, missionType, path }, ref) => {
    const accent = missionColor(missionType);
    const polyPoints = path && path.length >= 2 ? buildPolylinePoints(path, ROUTE_W, ROUTE_H) : '';

    return (
      <ViewShot ref={ref} options={{ format: 'png', quality: 1.0 }} style={sc.shot}>
        <View style={[sc.card, { borderTopColor: accent }]}>
          {/* Header */}
          <View style={[sc.header, { backgroundColor: accent }]}>
            <Text style={sc.brand}>RunQuest</Text>
            <View style={[sc.typePill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={sc.typeLabel}>{missionLabel(missionType)}</Text>
            </View>
          </View>

          {/* Distance hero */}
          <View style={sc.heroSection}>
            <Text style={sc.heroDistance}>{formatDist(distanceKm)}</Text>
            <Text style={sc.heroDistLabel}>Distance</Text>
          </View>

          {/* Stats row */}
          <View style={sc.statsRow}>
            <StatBlock label="Pace" value={formatPace(distanceKm, durationMin)} accent="#2196F3" />
            <View style={sc.statsDivider} />
            <StatBlock label="Time" value={formatDuration(durationMin)} accent="#FF9800" />
          </View>

          {/* Route path (or placeholder) */}
          <View style={sc.routeSection}>
            {polyPoints.length > 0 ? (
              <Svg width={ROUTE_W} height={ROUTE_H}>
                <Polyline
                  points={polyPoints}
                  fill="none"
                  stroke={accent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <View style={[sc.routePlaceholder, { borderColor: accent }]}>
                <Text style={[sc.routePlaceholderText, { color: accent }]}>
                  🏃 {missionLabel(missionType)}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[sc.footer, { borderTopColor: '#EEEEEE' }]}>
            <View style={sc.footerStat}>
              <MaterialIcons name="local-fire-department" size={18} color="#FF9800" />
              <Text style={sc.footerText}>Day {streakDay} streak</Text>
            </View>
            <View style={sc.footerStat}>
              <MaterialIcons name="star" size={18} color="#9C27B0" />
              <Text style={[sc.footerText, { color: '#9C27B0' }]}>+{xpEarned} XP</Text>
            </View>
            <Text style={sc.footerBrand}>runquest.app</Text>
          </View>
        </View>
      </ViewShot>
    );
  },
);

RunShareCard.displayName = 'RunShareCard';
export default RunShareCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  shot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  } as ViewStyle,
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 6,
    overflow: 'hidden',
  } as ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  } as ViewStyle,
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  } as TextStyle,
  typePill: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  } as ViewStyle,
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,

  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  } as ViewStyle,
  heroDistance: {
    fontSize: 64,
    fontWeight: '800',
    color: '#212121',
    letterSpacing: -2,
  } as TextStyle,
  heroDistLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9E9E9E',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 0,
  } as ViewStyle,
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  } as TextStyle,
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  statsDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 16,
  } as ViewStyle,

  routeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ROUTE_H + 16,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 0,
    paddingVertical: 8,
  } as ViewStyle,
  routePlaceholder: {
    width: ROUTE_W,
    height: ROUTE_H,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  routePlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
  } as TextStyle,

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 'auto',
  } as ViewStyle,
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  footerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  } as TextStyle,
  footerBrand: {
    fontSize: 12,
    color: '#BDBDBD',
    fontWeight: '500',
  } as TextStyle,
});
