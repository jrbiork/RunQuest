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
import { PERSONA_LABELS } from '../../constants/campaigns';
import { EXPERIENCE_DISPLAY_LABELS } from '../../constants/experienceDisplay';
import type { UserProfile } from '../../types';
import { personaLabelTitleCase } from '../../utils/personaDisplay';

const GOAL_LABELS: Record<string, string> = {
  habit: 'Secure Perimeter',
  consistency: 'Maintain Protocol',
  distance: 'Expand Network',
  speed: 'Surge Protocol',
  race: 'Supply Run',
};

function frequencyPerWeekLabel(profile: UserProfile): string {
  const n = profile.preferredDays?.length ?? profile.weeklyTargetRuns ?? 0;
  if (n === 0) return 'Not set';
  return `${n}x per week`;
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
              label="Operative style"
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
                EXPERIENCE_DISPLAY_LABELS[profile.experienceLevel ?? 'beginner'] ??
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
