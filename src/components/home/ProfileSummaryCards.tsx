import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../constants/theme';
import {
  PERSONA_CAMPAIGNS,
  PERSONA_LABELS,
  getTotalCampaignXp,
} from '../../constants/campaigns';
import type { UserProfile } from '../../types';

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
  if (n === 1) return '1 time per week';
  return `${n} times per week`;
}

type Props = {
  profile: UserProfile;
  /** Total XP to show (store + run history reconciled in parent). */
  accumulatedXp: number;
  /** Full campaigns finished (not “current campaign slot”). */
  campaignsCompleted: number;
};

export function CampaignProgressCard({
  profile,
  accumulatedXp,
  campaignsCompleted,
}: Props) {
  const personaId = profile.personaId;
  if (!personaId) return null;

  const personaMeta = PERSONA_LABELS[personaId];
  const campaigns = PERSONA_CAMPAIGNS[personaId];
  const totalCampaigns = campaigns.length;
  const totalPossibleXp = getTotalCampaignXp(personaId);
  const xpProgress =
    totalPossibleXp > 0 ? Math.min(accumulatedXp / totalPossibleXp, 1) : 0;
  const campaignProgress =
    totalCampaigns > 0 ? Math.min(campaignsCompleted / totalCampaigns, 1) : 0;
  const barProgress = Math.max(xpProgress, campaignProgress);

  return (
    <Card style={styles.campaignCard}>
      <View style={styles.campaignHeader}>
        <MaterialIcons
          name={personaMeta.icon as any}
          size={20}
          color={colors.orange}
        />
        <Text style={styles.campaignTitle}>{personaMeta.label}</Text>
        <View style={styles.campaignBadge}>
          <Text style={styles.campaignBadgeText}>
            CAMPAIGNS {Math.min(campaignsCompleted, totalCampaigns)} /{' '}
            {totalCampaigns}
          </Text>
        </View>
      </View>
      <ProgressBar
        progress={barProgress}
        color={colors.orange}
        backgroundColor={colors.orangeLight}
        height={10}
      />
      <Text style={styles.campaignXpText}>
        {accumulatedXp.toLocaleString()} / {totalPossibleXp.toLocaleString()} XP
        — {Math.min(campaignsCompleted, totalCampaigns)} / {totalCampaigns}{' '}
        completed
      </Text>
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
              icon="fitness-center"
              label="Persona"
              value={PERSONA_LABELS[profile.personaId].label}
            />
            <Divider />
            <ProfileRow
              icon="directions-run"
              label="Default Mode"
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
  campaignCard: {
    gap: spacing.md,
  } as ViewStyle,
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  campaignTitle: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  campaignBadge: {
    backgroundColor: colors.orangeLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.orange,
  } as ViewStyle,
  campaignBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  campaignXpText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
