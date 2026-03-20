import { forwardRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import ViewShot from 'react-native-view-shot';
import type { CompletedRun } from '../../types';
import { getDayMap, getMonthStats, getMonthName } from '../../utils/statsUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_WIDTH = 390;
const CARD_HEIGHT = 500;
const GRID_COLS = 7;
const CELL = 38;
const CELL_GAP = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function leadingBlanks(year: number, month: number): number {
  return isoWeekday(new Date(year, month, 1));
}

function formatDist(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

// Runs → heat colour (dark teal scale)
function heatColor(runCount: number): string {
  if (runCount === 0) return '#1C1C2C';
  if (runCount === 1) return 'rgba(78,204,163,0.4)';
  return '#4ECCA3';
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface MonthShareCardProps {
  runHistory: CompletedRun[];
  year: number;
  month: number;
}

const MonthShareCard = forwardRef<ViewShot, MonthShareCardProps>(
  ({ runHistory, year, month }, ref) => {
    const stats = getMonthStats(runHistory, year, month);
    const dayMap = getDayMap(runHistory, year, month);
    const monthName = getMonthName(month);

    const blanks = leadingBlanks(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(blanks).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
      <ViewShot ref={ref} options={{ format: 'png', quality: 1.0 }} style={sc.shot}>
        <View style={sc.card}>
          {/* Header */}
          <View style={sc.header}>
            <Text style={sc.brand}>RunQuest</Text>
            <View style={sc.monthBadge}>
              <Text style={sc.monthBadgeText}>
                {monthName} {year}
              </Text>
            </View>
          </View>

          {/* Calendar heatmap */}
          <View style={sc.calSection}>
            {/* Day labels */}
            <View style={sc.dayLabels}>
              {DAY_LABELS.map((d, i) => (
                <Text key={i} style={sc.dayLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Grid */}
            <View style={sc.grid}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`b-${idx}`} style={sc.cell} />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const runs = dayMap.get(dateStr) ?? [];
                const bg = heatColor(runs.length);
                return (
                  <View key={dateStr} style={[sc.cell, { backgroundColor: bg }]}>
                    <Text style={[sc.cellText, runs.length > 0 && sc.cellTextActive]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Monthly totals */}
          <View style={sc.totalsRow}>
            <TotalStat value={`${stats.totalXp}`} label="XP" color="#7C4DFF" />
            <View style={sc.totalsDivider} />
            <TotalStat value={`${stats.totalRuns}`} label="runs" color="#4ECCA3" />
            <View style={sc.totalsDivider} />
            <TotalStat
              value={stats.totalDistanceKm > 0 ? formatDist(stats.totalDistanceKm) : '–'}
              label="distance"
              color="#00B4D8"
            />
          </View>

          {/* Footer */}
          <View style={sc.footer}>
            <Text style={sc.footerText}>Keep running. Rebuild the world.</Text>
            <Text style={sc.footerBrand}>RUNQUEST</Text>
          </View>
        </View>
      </ViewShot>
    );
  },
);

MonthShareCard.displayName = 'MonthShareCard';
export default MonthShareCard;

// ─── Sub-component ────────────────────────────────────────────────────────────

function TotalStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={sc.totalStat}>
      <Text style={[sc.totalValue, { color }]}>{value}</Text>
      <Text style={sc.totalLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  shot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  } as ViewStyle,
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#0A0A0F',
    overflow: 'hidden',
  } as ViewStyle,

  header: {
    backgroundColor: '#12121C',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  } as ViewStyle,
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  } as TextStyle,
  monthBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  } as ViewStyle,
  monthBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,

  calSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  } as ViewStyle,
  dayLabels: {
    flexDirection: 'row',
    gap: CELL_GAP,
  } as ViewStyle,
  dayLabel: {
    width: CELL,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#4A4A5C',
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  } as ViewStyle,
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 6,
    backgroundColor: '#1C1C2C',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cellText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4A4A5C',
  } as TextStyle,
  cellTextActive: {
    color: '#0A0A0F',
    fontWeight: '700',
  } as TextStyle,

  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#12121C',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  } as ViewStyle,
  totalsDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#2A2A3E',
    marginHorizontal: 12,
  } as ViewStyle,
  totalStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  totalValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,
  totalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8AA8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    marginTop: 'auto',
  } as ViewStyle,
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A8AA8',
    fontStyle: 'italic',
  } as TextStyle,
  footerBrand: {
    fontSize: 11,
    color: '#4A4A5C',
    fontWeight: '700',
    letterSpacing: 2,
  } as TextStyle,
});
