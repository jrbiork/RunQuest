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
import {
  useUserStore,
  selectWeeklyRunsTarget,
} from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { Card } from '../../src/components/ui/Card';
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
const RANK_TITLES = [
  'Field Recruit',
  'Patrol Runner',
  'Zone Scout',
  'Network Courier',
  'Signal Runner',
  'Grid Operative',
  'Sector Vanguard',
  'Zone Commander',
  'Iron Legs',
  'Wasteland Ranger',
  'Signal Legend',
  'Grid Phantom',
  'Marathon Survivor',
  'Ghost Runner',
  'RunQuest Champion',
];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const totalDistanceKm = useUserStore((s) => s.totalDistanceKm);
  const runHistory = useUserStore((s) => s.runHistory);
  const totalCampaignsCompleted = useUserStore((s) => s.totalCampaignsCompleted);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);
  const audioMuted = useUserStore((s) => s.audioMuted);
  const setAudioMuted = useUserStore((s) => s.setAudioMuted);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);

  const dayOffset = useDevStore((s) => s.dayOffset);
  void dayOffset; // consumed for reactivity
  const adjustDay = useDevStore((s) => s.adjustDay);
  const resetDateOffset = useDevStore((s) => s.resetDateOffset);
  const generateWeek = useMissionsStore((s) => s.generateWeek);

  const [showGoalEditor, setShowGoalEditor] = useState(false);
  void showGoalEditor;

  const runsThisWeek = weeklyProgress?.runsCompleted ?? 0;
  const weekProgress =
    runsTarget > 0 ? Math.min(runsThisWeek / runsTarget, 1) : 0;

  const missionsCompleted = useMemo(
    () => runHistory.filter((r) => r.goalMet).length,
    [runHistory],
  );

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
              <MaterialIcons
                name="directions-run"
                size={38}
                color={colors.primary}
              />
            </View>
          </View>
          <View style={styles.identity}>
            {/* Level badge */}
            <View style={styles.levelBadge}>
              <MaterialIcons
                name="military-tech"
                size={13}
                color={colors.ochre}
              />
              <Text style={styles.levelBadgeText}>
                SCAVENGER LVL {levelInfo.level}
              </Text>
            </View>
            <Text style={styles.rankTitle}>
              {
                RANK_TITLES[
                  Math.min(levelInfo.level - 1, RANK_TITLES.length - 1)
                ]
              }
            </Text>
            <Text style={styles.xpTotal}>{xp.toLocaleString()} XP</Text>
          </View>
        </View>

        {/* ─── Stats grid ───────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatBlock
            label="Sorties"
            value={totalRuns.toString()}
            icon="directions-run"
            iconColor={colors.primary}
          />
          <StatBlock
            label="Distance"
            value={formatDistance(totalDistanceKm)}
            icon="straighten"
            iconColor={colors.blue}
          />
          <StatBlock
            label="Mission Complete"
            value={missionsCompleted.toString()}
            icon="task-alt"
            iconColor={colors.orange}
          />
          <StatBlock
            label="Campaign Complete"
            value={totalCampaignsCompleted.toString()}
            icon="public"
            iconColor={colors.yellow}
          />
        </View>

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

        {/* ─── Dev Tools ───────────────────────────────────────────── */}
        <Card style={styles.devCard}>
          <View style={styles.devHeader}>
            <MaterialIcons name="bug-report" size={14} color={colors.ochre} />
            <Text style={styles.devTitle}>DEV TOOLS</Text>
          </View>

          <Text style={styles.devDateLabel}>
            {getMockedDateLabel(dayOffset)}
          </Text>

          <View style={styles.devRow}>
            <TouchableOpacity
              style={styles.devBtn}
              onPress={() => adjustDay(-1)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-left"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.devBtnText}>–1 DAY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.devBtn,
                styles.devBtnReset,
                dayOffset === 0 && styles.devBtnDisabled,
              ]}
              onPress={resetDateOffset}
              disabled={dayOffset === 0}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="refresh"
                size={16}
                color={dayOffset === 0 ? colors.textTertiary : colors.orange}
              />
              <Text
                style={[
                  styles.devBtnText,
                  dayOffset === 0 && { color: colors.textTertiary },
                ]}
              >
                RESET
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devBtn}
              onPress={() => adjustDay(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.devBtnText}>+1 DAY</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
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
                      Alert.alert(
                        'Missions Reset',
                        'Your weekly deployment schedule has been updated.',
                      );
                    },
                  },
                ],
              );
            }}
            variant="secondary"
            fullWidth
          />
        )}

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

function StatBlock({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
}) {
  return (
    <View style={styles.statBlock}>
      <MaterialIcons name={icon as any} size={22} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
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
