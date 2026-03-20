import { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore, selectCompletedCount, selectAllComplete } from '../../src/store/missionsStore';
import { JourneyPath } from '../../src/components/journey/JourneyPath';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { colors, spacing, fontSizes, fontWeights, radii, shadows } from '../../src/constants/theme';

export default function JourneyScreen() {
  const profile = useUserStore((s) => s.profile);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completedCount = useMissionsStore(selectCompletedCount);
  const allComplete = useMissionsStore(selectAllComplete);
  const refreshMissions = useMissionsStore((s) => s.refreshIfNewWeek);

  useEffect(() => {
    if (profile) refreshMissions(profile);
  }, []);

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
          <Text style={styles.title}>This Week</Text>
          <Text style={styles.subtitle}>
            {allComplete
              ? 'All missions complete! 🎉'
              : totalMissions === 0
              ? 'Complete onboarding to get missions'
              : `${completedCount} of ${totalMissions} missions done`}
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

        {/* Tip when missions locked */}
        {!allComplete && totalMissions > 0 && completedCount < totalMissions && (
          <View style={styles.tip}>
            <MaterialIcons name="info-outline" size={16} color={colors.blue} />
            <Text style={styles.tipText}>
              Tap any unlocked mission to view details and start your run.
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
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  } as TextStyle,
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
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
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  weekCardCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
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
