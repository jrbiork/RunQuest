import { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore, selectCompletedCount, selectAllComplete } from '../../src/store/missionsStore';
import { useDevStore } from '../../src/store/devStore';
import { getWeekStartISO } from '../../src/utils/dateUtils';
import { JourneyPath } from '../../src/components/journey/JourneyPath';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { colors, spacing, fontSizes, fontWeights, radii, shadows } from '../../src/constants/theme';

export default function JourneyScreen() {
  const profile = useUserStore((s) => s.profile);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completedCount = useMissionsStore(selectCompletedCount);
  const allComplete = useMissionsStore(selectAllComplete);
  const refreshMissions = useMissionsStore((s) => s.refreshIfNewWeek);
  const generateWeek = useMissionsStore((s) => s.generateWeek);
  const dayOffset = useDevStore((s) => s.dayOffset);

  // Initial load
  useEffect(() => {
    if (profile) refreshMissions(profile);
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

  const totalMissions = weekMissions.length;
  const weekProgress = totalMissions > 0 ? completedCount / totalMissions : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>DEPLOYMENT LOG</Text>
          <Text style={styles.subtitle}>
            {allComplete
              ? 'ALL MISSIONS COMPLETE — ZONE RESTORED'
              : totalMissions === 0
              ? 'Complete onboarding to receive missions'
              : `${completedCount} / ${totalMissions} MISSIONS EXECUTED`}
          </Text>
        </View>

        {/* Week progress bar */}
        {totalMissions > 0 && (
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

        {/* Mission path */}
        <JourneyPath missions={weekMissions} allComplete={allComplete} />

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
