import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  Modal,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../src/constants/theme';
import {
  getLevelAccentForIndex,
  getLevelInfo,
  getXpRemainingToNextLevel,
  LEVEL_CLASS_TITLES,
  SCAVENGER_LEVEL_COUNT,
} from '../../src/utils/xpCalculator';
import { getDisplayXpTotal } from '../../src/utils/displayXp';

const TAILOR_MS = 2200;
const TICK_MS = 48;

export default function OnboardingTailoringScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const runHistory = useUserStore((s) => s.runHistory);
  const missionCount = useMissionsStore((s) => s.weekMissions.length);
  const iosLocationPromptDone = useUserStore(
    (s) => s.iosAlwaysLocationPromptCompleted,
  );
  const markIosLocationPromptDone = useUserStore(
    (s) => s.markIosAlwaysLocationPromptCompleted,
  );
  const [progress, setProgress] = useState(0);
  const [phaseDone, setPhaseDone] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationRequesting, setLocationRequesting] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / TAILOR_MS);
      setProgress(t);
      if (t >= 1) {
        clearInterval(id);
        setPhaseDone(true);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!profile?.personaId) {
      router.replace('/(tabs)');
    }
  }, [profile?.personaId]);

  const displayXp = useMemo(
    () => getDisplayXpTotal({ xp, runHistory }),
    [xp, runHistory],
  );

  const levelInfo = useMemo(() => {
    const assignedLevel = profile?.startingClassLevel;
    if (assignedLevel != null && assignedLevel > 0) {
      const index0 = Math.min(
        SCAVENGER_LEVEL_COUNT - 1,
        Math.max(0, assignedLevel - 1),
      );
      return {
        level: assignedLevel,
        title: LEVEL_CLASS_TITLES[index0] ?? 'Recruit',
        accentColor: getLevelAccentForIndex(index0),
      };
    }
    const fromXp = getLevelInfo(displayXp);
    return {
      level: fromXp.level,
      title: fromXp.title,
      accentColor: fromXp.accentColor,
    };
  }, [displayXp, profile?.startingClassLevel]);
  const xpToNext = useMemo(
    () => getXpRemainingToNextLevel(displayXp),
    [displayXp],
  );

  const nextRankTitle = useMemo(() => {
    if (levelInfo.level >= SCAVENGER_LEVEL_COUNT) return null;
    return LEVEL_CLASS_TITLES[levelInfo.level] ?? null;
  }, [levelInfo.level]);

  const goToTabs = () => router.replace('/(tabs)');

  const handleEnterBase = () => {
    if (Platform.OS === 'ios' && !iosLocationPromptDone) {
      setLocationModalVisible(true);
      return;
    }
    goToTabs();
  };

  const handleLocationContinue = async () => {
    setLocationRequesting(true);
    try {
      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // expo-location may throw if already determined
    } finally {
      setLocationRequesting(false);
    }
    markIosLocationPromptDone();
    setLocationModalVisible(false);
    goToTabs();
  };

  const handleLocationNotNow = () => {
    markIosLocationPromptDone();
    setLocationModalVisible(false);
    goToTabs();
  };

  if (!profile?.personaId) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {[0.15, 0.35, 0.55, 0.75].map((frac) => (
        <View
          key={frac}
          style={[styles.gridLine, { top: `${frac * 100}%` as any }]}
          pointerEvents="none"
        />
      ))}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <MaterialIcons name="wifi" size={11} color={colors.orange} />
          <Text style={styles.badgeText}>CLASS ASSIGNMENT</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.kicker}>YOUR CLASS</Text>
          <Text style={styles.title}>You&apos;re cleared to start</Text>
          <Text style={styles.sub}>
            You begin as <Text style={styles.subEm}>{levelInfo.title}</Text>.
            Your mission queue is tailored from your distance and pace answers.
            Complete missions for XP - reach the next level to get a fresh set.
            Hit distance under target time for full credit.
          </Text>
        </View>

        <View style={styles.progressBlock}>
          <ProgressBar
            progress={progress}
            color={levelInfo.accentColor}
            height={8}
          />
        </View>

        {phaseDone && (
          <View
            style={[styles.rankCard, { borderColor: levelInfo.accentColor }]}
          >
            <View
              style={[
                styles.rankSwatch,
                { backgroundColor: levelInfo.accentColor },
              ]}
            />
            <View style={styles.rankBody}>
              <Text style={styles.summaryLabel}>Starting level</Text>
              <Text style={[styles.rankName, { color: levelInfo.accentColor }]}>
                {levelInfo.title}
              </Text>
              <Text style={styles.summaryDesc}>
                Level {levelInfo.level} of {SCAVENGER_LEVEL_COUNT}. Earn XP from
                missions to cross the next threshold.
              </Text>
              {nextRankTitle && xpToNext > 0 ? (
                <Text style={styles.nextRank}>
                  +{xpToNext} XP to{' '}
                  <Text style={styles.nextRankBold}>{nextRankTitle}</Text>
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {phaseDone && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <MaterialIcons name="route" size={20} color={colors.primary} />
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Missions queued</Text>
                <Text style={styles.summaryValue}>
                  {missionCount > 0
                    ? `${missionCount} in queue`
                    : 'Open journey to sync'}
                </Text>
                <Text style={styles.summaryDesc}>
                  Finish them in order. When you promote to a new level, you get
                  a fresh set.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Enter base"
          onPress={handleEnterBase}
          fullWidth
          disabled={!phaseDone}
        />
      </View>

      <Modal
        visible={locationModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleLocationNotNow}
      >
        <View style={styles.locModalBackdrop}>
          <View style={styles.locModalCard}>
            <MaterialIcons
              name="my-location"
              size={24}
              color={colors.primary}
              style={styles.locModalIcon}
            />
            <Text style={styles.locModalTitle}>Always-on location</Text>
            <Text style={styles.locModalBody}>
              For accurate distance and route when RunQuest is in the background
              or your screen is locked, choose{' '}
              <Text style={styles.locModalEm}>Always</Text> when prompted. You
              can change this anytime in Settings.
            </Text>
            <TouchableOpacity
              style={[styles.locOpenSettings, { borderColor: colors.primary }]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="settings" size={18} color={colors.primary} />
              <Text style={styles.locOpenSettingsText}>Open Settings</Text>
            </TouchableOpacity>
            <Button
              label="Continue"
              onPress={handleLocationContinue}
              fullWidth
              disabled={locationRequesting}
              loading={locationRequesting}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  } as ViewStyle,
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.25,
  } as ViewStyle,
  scroll: { flex: 1 } as ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  } as ViewStyle,
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.orange,
    marginTop: spacing.md,
  } as ViewStyle,
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  } as ViewStyle,
  kicker: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    lineHeight: 36,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  sub: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  } as TextStyle,
  subEm: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  progressBlock: {
    marginTop: spacing.md,
  } as ViewStyle,
  rankCard: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    overflow: 'hidden',
  } as ViewStyle,
  rankSwatch: {
    width: 8,
    alignSelf: 'stretch',
  } as ViewStyle,
  rankBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  rankName: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  nextRank: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  } as TextStyle,
  nextRankBold: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  summary: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  } as ViewStyle,
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  } as ViewStyle,
  summaryTextCol: {
    flex: 1,
    gap: 4,
  } as ViewStyle,
  summaryLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  summaryDesc: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,

  locModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  } as ViewStyle,
  locModalCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  } as ViewStyle,
  locModalIcon: {
    alignSelf: 'center',
  } as TextStyle,
  locModalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  locModalBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  } as TextStyle,
  locModalEm: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  locOpenSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.primaryLight,
  } as ViewStyle,
  locOpenSettingsText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
});
