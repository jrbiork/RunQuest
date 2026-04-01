import { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import {
  useMissionsStore,
  selectCompletedCount,
} from '../../src/store/missionsStore';
import { useDevStore } from '../../src/store/devStore';
import { getWeekStartISO } from '../../src/utils/dateUtils';
import { JourneyPath } from '../../src/components/journey/JourneyPath';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { PERSONA_CAMPAIGNS, PERSONA_LABELS } from '../../src/constants/campaigns';
import { colors, spacing, fontSizes, fontWeights, radii, shadows } from '../../src/constants/theme';

export default function JourneyScreen() {
  const profile = useUserStore((s) => s.profile);
  const runHistory = useUserStore((s) => s.runHistory);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const currentCampaignIndex = useMissionsStore((s) => s.currentCampaignIndex);
  const completedCount = useMissionsStore(selectCompletedCount);

  // Compute XP using actual run history for completed missions so the values
  // match what's shown on each mission card, regardless of persisted xpReward.
  const { campaignXpEarned, campaignXpTotal } = useMemo(() => {
    // Sort ascending so later runs overwrite earlier ones in the map
    const sorted = [...runHistory].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const earnedByMission = new Map<string, number>();
    for (const run of sorted) {
      earnedByMission.set(run.missionId, run.xpEarned);
    }
    let earned = 0;
    let total = 0;
    for (const m of campaignMissions) {
      const actual = m.status === 'completed' ? (earnedByMission.get(m.id) ?? m.xpReward) : m.xpReward;
      if (m.status === 'completed') earned += actual;
      total += actual;
    }
    return { campaignXpEarned: earned, campaignXpTotal: total };
  }, [campaignMissions, runHistory]);
  const refreshMissions = useMissionsStore((s) => s.refreshIfNewWeek);
  const generateWeek = useMissionsStore((s) => s.generateWeek);
  const initCampaign = useMissionsStore((s) => s.initCampaign);
  const advanceCampaign = useMissionsStore((s) => s.advanceCampaign);
  const canAdvance = useMissionsStore((s) => s.canAdvanceCampaign());
  const dayOffset = useDevStore((s) => s.dayOffset);

  const missions = campaignMissions.length > 0 ? campaignMissions : weekMissions;
  const allComplete = missions.length > 0 && missions.every((m) => m.status === 'completed');
  const totalMissions = missions.length;

  const useCampaigns = !!profile?.personaId && campaignMissions.length > 0;
  const personaId = profile?.personaId;
  const campaigns = personaId ? PERSONA_CAMPAIGNS[personaId] : null;
  const currentCampaign = campaigns?.[currentCampaignIndex];
  const totalCampaigns = campaigns?.length ?? 10;
  const personaLabel = personaId ? PERSONA_LABELS[personaId].label : null;

  // Initial load
  useEffect(() => {
    if (!profile) return;
    if (profile.personaId && campaignMissions.length === 0) {
      initCampaign(profile);
    } else {
      refreshMissions(profile);
    }
  }, []);

  // When dev tools shift to a different week, regenerate missions for that week
  useEffect(() => {
    if (!profile) return;
    const mockedWeekStart = getWeekStartISO();
    const storedWeekStart = useMissionsStore.getState().weekStartDate;
    if (mockedWeekStart !== storedWeekStart) {
      generateWeek(profile);
    }
  }, [dayOffset, profile]);

  const weekProgress = totalMissions > 0 ? completedCount / totalMissions : 0;
  const campaignProgress = campaignXpTotal > 0 ? campaignXpEarned / campaignXpTotal : 0;

  const handleAdvance = () => {
    if (!profile) return;
    advanceCampaign(profile);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {useCampaigns && currentCampaign ? (
            <>
              <View style={styles.campaignBadge}>
                <MaterialIcons name="flag" size={12} color={colors.orange} />
                <Text style={styles.campaignBadgeText}>
                  {personaLabel} · CAMPAIGN {currentCampaignIndex + 1} / {totalCampaigns}
                </Text>
              </View>
              <Text style={styles.title}>{currentCampaign.title}</Text>
              <Text style={styles.subtitle}>{currentCampaign.subtitle}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>DEPLOYMENT LOG</Text>
              <Text style={styles.subtitle}>
                {allComplete
                  ? 'ALL MISSIONS COMPLETE — ZONE RESTORED'
                  : totalMissions === 0
                  ? 'Complete onboarding to receive missions'
                  : `${completedCount} / ${totalMissions} MISSIONS EXECUTED`}
              </Text>
            </>
          )}
        </View>

        {/* Campaign XP progress bar */}
        {useCampaigns && totalMissions > 0 && (
          <View style={styles.weekCard}>
            <View style={styles.weekCardHeader}>
              <View style={styles.weekCardLeft}>
                <MaterialIcons name="emoji-events" size={18} color={colors.orange} />
                <Text style={styles.weekCardTitle}>Campaign XP</Text>
              </View>
              <Text style={styles.weekCardCount}>
                {campaignXpEarned} / {campaignXpTotal} XP
              </Text>
            </View>
            <ProgressBar
              progress={campaignProgress}
              color={colors.orange}
              backgroundColor={colors.orangeLight}
              height={8}
            />
            <Text style={styles.weekCardSub}>
              {completedCount} / {totalMissions} missions completed
            </Text>
          </View>
        )}

        {/* Legacy week progress bar (non-campaign users) */}
        {!useCampaigns && totalMissions > 0 && (
          <View style={styles.weekCard}>
            <View style={styles.weekCardHeader}>
              <View style={styles.weekCardLeft}>
                <MaterialIcons name="route" size={18} color={colors.primary} />
                <Text style={styles.weekCardTitle}>Mission Path</Text>
              </View>
              <Text style={styles.weekCardCount}>{completedCount}/{totalMissions}</Text>
            </View>
            <ProgressBar
              progress={weekProgress}
              color={colors.primary}
              backgroundColor={colors.primaryLight}
              height={8}
            />
          </View>
        )}

        {/* Advance campaign button */}
        {useCampaigns && canAdvance && currentCampaignIndex + 1 < totalCampaigns && (
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={handleAdvance}
            activeOpacity={0.85}
          >
            <MaterialIcons name="arrow-forward" size={20} color={colors.textInverse} />
            <Text style={styles.advanceBtnText}>
              ADVANCE TO CAMPAIGN {currentCampaignIndex + 2}
            </Text>
          </TouchableOpacity>
        )}

        {/* All campaigns complete */}
        {useCampaigns && canAdvance && currentCampaignIndex + 1 >= totalCampaigns && (
          <View style={styles.allCampaignsDone}>
            <MaterialIcons name="public" size={32} color={colors.primary} />
            <Text style={styles.allCampaignsDoneTitle}>WORLD RESTORED</Text>
            <Text style={styles.allCampaignsDoneSub}>
              All 10 campaigns complete. The Runners saved the world.
            </Text>
          </View>
        )}

        {/* Missions section */}
        {totalMissions > 0 && (
          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.missionsSectionTitle}>Missions</Text>
            </View>
          </View>
        )}

        {/* Mission path */}
        <JourneyPath missions={missions} allComplete={allComplete} />

        {/* Intel tip */}
        {!allComplete && totalMissions > 0 && completedCount < totalMissions && (
          <View style={styles.tip}>
            <MaterialIcons name="radio" size={16} color={colors.blue} />
            <Text style={styles.tipText}>
              Tap any active mission to view briefing and begin your sortie.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  } as ViewStyle,
  header: {
    gap: spacing.xs,
  } as ViewStyle,
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  } as ViewStyle,
  campaignBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  weekCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  weekCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  weekCardCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
  } as TextStyle,
  weekCardSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  } as TextStyle,
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.md,
  } as ViewStyle,
  advanceBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  allCampaignsDone: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.xxl,
  } as ViewStyle,
  allCampaignsDoneTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,
  allCampaignsDoneSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
  missionsSection: {
    gap: spacing.sm,
  } as ViewStyle,
  missionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  accentBar: {
    width: 3,
    height: 16,
    backgroundColor: colors.ochre,
    borderRadius: 2,
  } as ViewStyle,
  missionsSectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.blue,
    lineHeight: 18,
  } as TextStyle,
});
