import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../constants/theme';
import {
  getTotalCampaignXp,
  PERSONA_CAMPAIGNS,
  PERSONA_LABELS,
} from '../../constants/campaigns';
import type { PersonaId, UserProfile } from '../../types';

const PERSONA_ORDER: PersonaId[] = [
  'ghost',
  'scout',
  'operative',
  'elite',
  'vanguard',
];

function nextPersonaId(personaId: PersonaId): PersonaId | null {
  const i = PERSONA_ORDER.indexOf(personaId);
  if (i < 0 || i >= PERSONA_ORDER.length - 1) return null;
  return PERSONA_ORDER[i + 1]!;
}

/** Title-case persona label (e.g. SCOUT → Scout). */
export function personaLabelTitleCase(upperLabel: string): string {
  return upperLabel
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const GOAL_LABELS: Record<string, string> = {
  habit: 'Secure Perimeter',
  consistency: 'Maintain Protocol',
  distance: 'Expand Network',
  speed: 'Surge Protocol',
  race: 'Supply Run',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Recruit',
  intermediate: 'Operative',
  advanced: 'Vanguard',
};

function frequencyPerWeekLabel(profile: UserProfile): string {
  const n = profile.preferredDays?.length ?? profile.weeklyTargetRuns ?? 0;
  if (n === 0) return 'Not set';
  return `${n}x per week`;
}

type Props = {
  profile: UserProfile;
  /** Full campaigns finished (not “current campaign slot”). */
  campaignsCompleted: number;
  /** Display XP total (reconciled) for this persona’s track. */
  displayXpTotal: number;
};

/** Interpolate hex component between two values, 0–1. */
function lerpHex(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

function ChevronProgressBar({
  completed,
  total,
  currentLabel,
  nextLabel,
}: {
  completed: number;
  total: number;
  currentLabel: string;
  nextLabel: string | null;
}) {
  const count = Math.max(1, total);

  return (
    <View style={styles.chevronContainer}>
      <Text style={styles.chevronRankLabel}>{currentLabel}</Text>

      <View style={styles.chevronTrack}>
        {Array.from({ length: count }).map((_, i) => {
          const filled = i < completed;
          let bodyColor: string;
          if (filled) {
            // Gradient: ochre #B95C37 → orange #F68F4D across filled range
            const t = completed > 1 ? i / (completed - 1) : 1;
            const r = lerpHex(0xb9, 0xf6, t);
            const g = lerpHex(0x5c, 0x8f, t);
            const b = lerpHex(0x37, 0x4d, t);
            bodyColor = `rgb(${r},${g},${b})`;
          } else {
            bodyColor = colors.surfaceElevated;
          }
          return (
            <View key={i} style={styles.chevronArrowWrapper}>
              {/* Rectangular body */}
              <View
                style={[
                  styles.chevronBody,
                  { backgroundColor: bodyColor },
                  !filled && styles.chevronBodyEmpty,
                ]}
              />
              {/* Right-pointing triangle tip */}
              <View
                style={[styles.chevronTip, { borderLeftColor: bodyColor }]}
              />
            </View>
          );
        })}
      </View>

      <Text style={[styles.chevronRankLabel, styles.chevronRankLabelRight]}>
        {nextLabel ?? '—'}
      </Text>
    </View>
  );
}

const ARROW_COUNT = 15;

export function CampaignProgressCard({
  profile,
  campaignsCompleted,
  displayXpTotal,
}: Props) {
  const personaId = profile.personaId;
  if (!personaId) return null;

  const personaMeta = PERSONA_LABELS[personaId];
  const totalCampaigns = Math.max(1, PERSONA_CAMPAIGNS[personaId]?.length ?? 1);
  const campaignProgress = Math.min(
    Math.max(campaignsCompleted / totalCampaigns, 0),
    1,
  );
  const filledArrows = Math.round(campaignProgress * ARROW_COUNT);
  const personaTrackXpCap = getTotalCampaignXp(personaId);
  const nextId = nextPersonaId(personaId);
  const nextTitle = nextId
    ? personaLabelTitleCase(PERSONA_LABELS[nextId].label)
    : null;
  const currentTitle = personaLabelTitleCase(personaMeta.label);

  return (
    <Card style={styles.evolutionCard}>
      <View style={styles.classRowInline}>
        <Text style={styles.evolutionRowLabel}>
          Class: <Text style={styles.evolutionRowValue}>{currentTitle}</Text>
        </Text>
        <Text style={styles.classInlineSep}> · </Text>
        <Text style={styles.evolutionRowLabel}>
          Next Class:{' '}
          <Text style={styles.evolutionRowValue}>{nextTitle ?? '—'}</Text>
        </Text>
      </View>

      <Text style={styles.evolutionSectionTitle}>Evolution progress</Text>

      <ChevronProgressBar
        completed={filledArrows}
        total={ARROW_COUNT}
        currentLabel={currentTitle}
        nextLabel={nextTitle}
      />

      <View style={styles.bulletList}>
        <Text style={styles.bulletLine}>
          {Math.round(displayXpTotal).toLocaleString()} /{' '}
          {personaTrackXpCap.toLocaleString()} XP
        </Text>
      </View>
    </Card>
  );
}

export function OperativeFileCard({ profile }: { profile: UserProfile }) {
  return (
    <Card style={styles.profileCard}>
      <SectionHeader icon="person" title="Operative File" />
      <View style={styles.profileRows}>
        {profile.personaId ? (
          <>
            <ProfileRow
              icon="military-tech"
              label="Class"
              value={personaLabelTitleCase(
                PERSONA_LABELS[profile.personaId].label,
              )}
            />
            <Divider />
            <ProfileRow
              icon="directions-run"
              label="Default"
              value={
                profile.defaultActivityMode === 'cycle' ? 'Cycling' : 'Running'
              }
            />
            <Divider />
            <ProfileRow
              icon="event"
              label="Frequency"
              value={frequencyPerWeekLabel(profile)}
            />
          </>
        ) : (
          <>
            <ProfileRow
              icon="fitness-center"
              label="Classification"
              value={
                EXPERIENCE_LABELS[profile.experienceLevel ?? 'beginner'] ??
                'Recruit'
              }
            />
            <Divider />
            <ProfileRow
              icon="flag"
              label="Primary Mandate"
              value={
                GOAL_LABELS[profile.runningGoal ?? 'habit'] ??
                'Maintain Protocol'
              }
            />
            <Divider />
            <ProfileRow
              icon="event"
              label="Frequency"
              value={frequencyPerWeekLabel(profile)}
            />
          </>
        )}
      </View>
    </Card>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={sh.row}>
      <MaterialIcons name={icon as any} size={15} color={colors.ochre} />
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  } as ViewStyle,
  title: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
});

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileRow}>
      <MaterialIcons
        name={icon as any}
        size={16}
        color={colors.textSecondary}
      />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  evolutionCard: {
    gap: spacing.sm,
  } as ViewStyle,
  classRowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 0,
  } as ViewStyle,
  classInlineSep: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
  } as TextStyle,
  evolutionRowLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
  evolutionRowValue: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  evolutionSectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.orange,
    letterSpacing: 0.4,
    marginTop: spacing.sm,
  } as TextStyle,
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  chevronTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,
  chevronArrowWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  chevronBody: {
    flex: 1,
    height: 16,
  } as ViewStyle,
  chevronBodyEmpty: {
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.border,
  } as ViewStyle,
  chevronTip: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  } as ViewStyle,
  chevronRankLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
  } as TextStyle,
  chevronRankLabelRight: {
    color: colors.textTertiary,
  } as TextStyle,
  bulletList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  } as ViewStyle,
  bulletLine: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  } as TextStyle,

  profileCard: { gap: spacing.sm } as ViewStyle,
  profileRows: { gap: 2 } as ViewStyle,
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  profileLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    width: 100,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  profileValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
});
