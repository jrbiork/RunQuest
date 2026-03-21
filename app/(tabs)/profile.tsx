import { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Switch } from 'react-native';
import { useUserStore, selectWeeklyRunsTarget } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useStreak } from '../../src/hooks/useStreak';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { StreakBadge } from '../../src/components/ui/StreakBadge';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';
import { getLevelInfo, formatDistance } from '../../src/utils/xpCalculator';
import { useDevStore, getMockedDateLabel } from '../../src/store/devStore';

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

const RANK_TITLES = [
  'Field Recruit', 'Patrol Runner', 'Zone Scout', 'Network Courier',
  'Signal Runner', 'Grid Operative', 'Sector Vanguard', 'Zone Commander',
  'Iron Legs', 'Wasteland Ranger', 'Signal Legend', 'Grid Phantom',
  'Marathon Survivor', 'Ghost Runner', 'RunQuest Champion',
];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const totalDistanceKm = useUserStore((s) => s.totalDistanceKm);
  const longestStreak = useUserStore((s) => s.longestStreak);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);
  const audioMuted = useUserStore((s) => s.audioMuted);
  const setAudioMuted = useUserStore((s) => s.setAudioMuted);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);

  const dayOffset = useDevStore((s) => s.dayOffset);
  const adjustDay = useDevStore((s) => s.adjustDay);
  const resetDateOffset = useDevStore((s) => s.resetDateOffset);
  const generateWeek = useMissionsStore((s) => s.generateWeek);

  const { streak, isAlive, message: streakMessage } = useStreak();

  const [showGoalEditor, setShowGoalEditor] = useState(false);
  void showGoalEditor;

  const runsThisWeek = weeklyProgress?.runsCompleted ?? 0;
  const weekProgress = runsTarget > 0 ? Math.min(runsThisWeek / runsTarget, 1) : 0;

  const handleReset = () => {
    Alert.alert(
      'Wipe Operative Data',
      'This will delete all progress and restart onboarding. The world goes dark again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Wipe',
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const milestones = RANK_TITLES.slice(0, Math.min(levelInfo.level + 2, RANK_TITLES.length));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Operative header ─────────────────────────────────────── */}
        <View style={styles.heroSection}>
          {/* Dog-tag avatar with ochre ring */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <MaterialIcons name="directions-run" size={38} color={colors.primary} />
            </View>
          </View>
          <View style={styles.identity}>
            {/* Level badge */}
            <View style={styles.levelBadge}>
              <MaterialIcons name="military-tech" size={13} color={colors.ochre} />
              <Text style={styles.levelBadgeText}>SCAVENGER LVL {levelInfo.level}</Text>
            </View>
            <Text style={styles.rankTitle}>{RANK_TITLES[Math.min(levelInfo.level - 1, RANK_TITLES.length - 1)]}</Text>
            <Text style={styles.xpTotal}>{xp.toLocaleString()} XP</Text>
          </View>
        </View>

        {/* ─── XP progress ──────────────────────────────────────────── */}
        <Card style={styles.xpCard}>
          <SectionHeader icon="trending-up" title="Rank Progress" />
          <View style={styles.xpCardBody}>
            <Text style={styles.xpCardSub}>
              {levelInfo.xpInLevel} / {levelInfo.xpToNextLevel} XP → LVL {levelInfo.level + 1}
            </Text>
            <ProgressBar
              progress={levelInfo.progress}
              color={colors.ochre}
              backgroundColor={colors.purpleLight}
              height={8}
            />
          </View>
        </Card>

        {/* ─── Stats grid ───────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatBlock label="Sorties" value={totalRuns.toString()} icon="directions-run" iconColor={colors.primary} />
          <StatBlock label="Distance" value={formatDistance(totalDistanceKm)} icon="straighten" iconColor={colors.blue} />
          <StatBlock label="Streak" value={`${streak}d`} icon="local-fire-department" iconColor={colors.orange} />
          <StatBlock label="Best" value={`${longestStreak}d`} icon="emoji-events" iconColor={colors.yellow} />
        </View>

        {/* ─── Streak status ─────────────────────────────────────────── */}
        <Card style={styles.streakCard}>
          <StreakBadge streak={streak} isAlive={isAlive} size="lg" showLabel />
          <Text style={styles.streakMsg}>{streakMessage}</Text>
        </Card>

        {/* ─── Weekly sortie progress ───────────────────────────────── */}
        <Card style={styles.weekCard}>
          <SectionHeader icon="calendar-today" title="This Week's Sorties" />
          <View style={styles.weekStats}>
            <Text style={styles.weekBold}>{runsThisWeek}</Text>
            <Text style={styles.weekDim}> / {runsTarget} sorties</Text>
          </View>
          <ProgressBar
            progress={weekProgress}
            color={colors.primary}
            backgroundColor={colors.primaryLight}
            height={6}
          />
        </Card>

        {/* ─── Operative profile details ────────────────────────────── */}
        {profile && (
          <Card style={styles.profileCard}>
            <SectionHeader icon="person" title="Operative File" />
            <View style={styles.profileRows}>
              <ProfileRow icon="fitness-center" label="Classification" value={EXPERIENCE_LABELS[profile.experienceLevel] ?? profile.experienceLevel} />
              <Divider />
              <ProfileRow icon="flag" label="Primary Mandate" value={GOAL_LABELS[profile.runningGoal] ?? profile.runningGoal} />
              <Divider />
              <ProfileRow icon="event" label="Active Days" value={profile.preferredDays.join(', ')} />
              <Divider />
              <ProfileRow icon="speed" label="Op Mode" value={profile.paceLevel.charAt(0).toUpperCase() + profile.paceLevel.slice(1)} />
            </View>
          </Card>
        )}

        {/* ─── Rank milestones ──────────────────────────────────────── */}
        <Card style={styles.milestonesCard}>
          <SectionHeader icon="military-tech" title="Rank Progression" />
          <View style={styles.milestoneList}>
            {milestones.map((title, idx) => {
              const lvl = idx + 1;
              const isUnlocked = lvl <= levelInfo.level;
              const isCurrent = lvl === levelInfo.level;
              return (
                <View key={lvl} style={styles.milestoneRow}>
                  <View style={[
                    styles.milestoneDot,
                    isUnlocked ? styles.milestoneDotDone : styles.milestoneDotLocked,
                    isCurrent && styles.milestoneDotCurrent,
                  ]}>
                    {isUnlocked && <MaterialIcons name="check" size={11} color={colors.textInverse} />}
                  </View>
                  <View style={styles.milestoneContent}>
                    <Text style={[styles.milestoneLvl, !isUnlocked && styles.textLocked]}>
                      LEVEL {lvl}
                    </Text>
                    <Text style={[styles.milestoneTitle, !isUnlocked && styles.textLocked]}>
                      {title}
                    </Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* ─── Settings ────────────────────────────────────────────── */}
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionHeader}>SETTINGS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons
                name={audioMuted ? 'volume-off' : 'volume-up'}
                size={20}
                color={audioMuted ? colors.textTertiary : colors.orange}
              />
              <View>
                <Text style={styles.settingLabel}>MISSION AUDIO</Text>
                <Text style={styles.settingSubLabel}>
                  {audioMuted ? 'Voice cues silenced' : 'Voice cues active'}
                </Text>
              </View>
            </View>
            <Switch
              value={!audioMuted}
              onValueChange={(val) => setAudioMuted(!val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={audioMuted ? colors.textTertiary : colors.orange}
            />
          </View>
        </Card>

        {/* ─── Actions ─────────────────────────────────────────────── */}
        {profile && (
          <Button
            label="Reset This Week's Missions"
            icon="refresh"
            onPress={() => {
              Alert.alert(
                'Reset Missions?',
                'This will wipe all current missions and generate a fresh deployment schedule for this week. Any progress will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      generateWeek(profile);
                      Alert.alert('Missions Reset', 'Your weekly deployment schedule has been updated.');
                    },
                  },
                ]
              );
            }}
            variant="secondary"
            fullWidth
          />
        )}

        {/* ─── Dev Tools ───────────────────────────────────────────── */}
        <Card style={styles.devCard}>
          <View style={styles.devHeader}>
            <MaterialIcons name="bug-report" size={14} color={colors.ochre} />
            <Text style={styles.devTitle}>DEV TOOLS</Text>
          </View>

          <Text style={styles.devDateLabel}>{getMockedDateLabel(dayOffset)}</Text>

          <View style={styles.devRow}>
            <TouchableOpacity style={styles.devBtn} onPress={() => adjustDay(-1)} activeOpacity={0.7}>
              <MaterialIcons name="chevron-left" size={20} color={colors.textPrimary} />
              <Text style={styles.devBtnText}>–1 DAY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.devBtn, styles.devBtnReset, dayOffset === 0 && styles.devBtnDisabled]}
              onPress={resetDateOffset}
              disabled={dayOffset === 0}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={16} color={dayOffset === 0 ? colors.textTertiary : colors.orange} />
              <Text style={[styles.devBtnText, dayOffset === 0 && { color: colors.textTertiary }]}>RESET</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.devBtn} onPress={() => adjustDay(1)} activeOpacity={0.7}>
              <Text style={styles.devBtnText}>+1 DAY</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          label="Wipe Operative Data"
          icon="warning"
          onPress={handleReset}
          variant="danger"
          fullWidth
          style={styles.resetBtn}
        />
      </ScrollView>
    </SafeAreaView>
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

function StatBlock({ label, value, icon, iconColor }: { label: string; value: string; icon: string; iconColor: string }) {
  return (
    <View style={styles.statBlock}>
      <MaterialIcons name={icon as any} size={22} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <MaterialIcons name={icon as any} size={16} color={colors.textSecondary} />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  scroll: { flex: 1 } as ViewStyle,
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  } as ViewStyle,

  // Operative header
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
  } as ViewStyle,
  avatarRing: {
    width: 78,
    height: 78,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    ...shadows.sm,
  } as ViewStyle,
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  identity: {
    flex: 1,
    gap: spacing.sm,
  } as ViewStyle,
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.ochre,
    alignSelf: 'flex-start',
  } as ViewStyle,
  levelBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.ochre,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  rankTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  xpTotal: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // XP card
  xpCard: { gap: spacing.md } as ViewStyle,
  xpCardBody: { gap: spacing.sm } as ViewStyle,
  xpCardSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  } as ViewStyle,
  statBlock: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  } as TextStyle,
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  } as ViewStyle,
  streakMsg: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,

  // Week card
  weekCard: { gap: spacing.md } as ViewStyle,
  weekStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
  } as ViewStyle,
  weekBold: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  weekDim: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,

  // Profile card
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

  // Milestones
  milestonesCard: { gap: spacing.md } as ViewStyle,
  milestoneList: { gap: spacing.sm } as ViewStyle,
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  milestoneDot: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  milestoneDotDone: { backgroundColor: colors.primary } as ViewStyle,
  milestoneDotCurrent: { backgroundColor: colors.primary, ...shadows.sm } as ViewStyle,
  milestoneDotLocked: { backgroundColor: colors.border } as ViewStyle,
  milestoneContent: { flex: 1 } as ViewStyle,
  milestoneLvl: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  milestoneTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  textLocked: { color: colors.textTertiary } as TextStyle,
  currentBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  currentBadgeText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,

  // Buttons
  resetBtn: { marginTop: spacing.sm } as ViewStyle,

  // Dev tools card
  devCard: {
    borderColor: colors.ochre,
    gap: spacing.sm,
  } as ViewStyle,
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  devTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.ochre,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,
  devDateLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  } as TextStyle,
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  devBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  devBtnReset: {
    borderColor: colors.orange,
  } as ViewStyle,
  devBtnDisabled: {
    borderColor: colors.border,
    opacity: 0.4,
  } as ViewStyle,
  devBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 1,
  } as TextStyle,

  // Settings card
  settingsCard: { gap: spacing.md } as ViewStyle,
  sectionHeader: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } as ViewStyle,
  settingLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  settingSubLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  } as TextStyle,
});
