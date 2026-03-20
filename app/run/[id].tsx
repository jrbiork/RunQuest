import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMissionsStore } from '../../src/store/missionsStore';
import { XPBadge } from '../../src/components/ui/XPBadge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, radii, fontSizes, fontWeights, missionConfig, shadows } from '../../src/constants/theme';
import { formatDistance, formatDuration } from '../../src/utils/xpCalculator';
import { MISSION_TEMPLATES } from '../../src/constants/missions';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const mission = weekMissions.find((m) => m.id === id);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Mission not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = missionConfig[mission.type];
  const template = MISSION_TEMPLATES[mission.type];
  const motivational = template.motivationalFraming[
    Math.floor(Math.random() * template.motivationalFraming.length)
  ] as string;

  const isCompleted = mission.status === 'completed';

  const handleComplete = () => {
    router.push({ pathname: '/run/active', params: { id: mission.id } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header gradient */}
      <LinearGradient
        colors={[config.color, config.color + 'DD']}
        style={styles.heroGradient}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <View style={styles.typePill}>
            <MaterialIcons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.heroTitle}>{mission.title}</Text>
          <Text style={styles.heroSubtitle}>{mission.subtitle}</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats cards */}
        <View style={styles.statsRow}>
          <StatCard icon="straighten" label="Distance" value={formatDistance(mission.targetDistanceKm)} color={config.color} />
          <StatCard icon="timer" label="Duration" value={`~${formatDuration(mission.targetDurationMin)}`} color={config.color} />
        </View>

        {/* XP reward */}
        <Card style={styles.xpCard}>
          <View style={styles.xpRow}>
            <View style={styles.xpLeft}>
              <Text style={styles.xpTitle}>Mission Reward</Text>
              <Text style={styles.xpSub}>Streak bonus may increase XP</Text>
            </View>
            <XPBadge xp={mission.xpReward} size="lg" />
          </View>
        </Card>

        {/* Description */}
        <Card style={styles.descCard}>
          <Text style={styles.descTitle}>About this mission</Text>
          <Text style={styles.descText}>{mission.description}</Text>
        </Card>

        {/* Motivational framing */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationQuote}>"{motivational}"</Text>
        </View>

        {/* CTA */}
        {isCompleted ? (
          <View style={styles.completedState}>
            <MaterialIcons name="check-circle" size={28} color={colors.primary} />
            <Text style={styles.completedText}>Mission completed!</Text>
          </View>
        ) : (
          <Button
            label="Start Run 🏃"
            onPress={handleComplete}
            fullWidth
            style={styles.cta}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '33' }]}>
      <MaterialIcons name={icon as any} size={20} color={color} />
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
  heroGradient: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    position: 'relative',
  } as ViewStyle,
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  } as ViewStyle,
  heroContent: {
    gap: spacing.sm,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  } as ViewStyle,
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  heroTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: '#fff',
    lineHeight: 36,
  } as TextStyle,
  heroSubtitle: {
    fontSize: fontSizes.md,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  } as TextStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.huge,
  } as ViewStyle,
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  } as ViewStyle,
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  } as TextStyle,
  xpCard: {} as ViewStyle,
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  xpLeft: {
    gap: spacing.xs,
  } as ViewStyle,
  xpTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  xpSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
  descCard: {
    gap: spacing.md,
  } as ViewStyle,
  descTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  descText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  } as TextStyle,
  motivationCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  } as ViewStyle,
  motivationQuote: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.primaryDark,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
  } as TextStyle,
  cta: {
    marginTop: spacing.sm,
  } as ViewStyle,
  completedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
  } as ViewStyle,
  completedText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  } as TextStyle,
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  } as ViewStyle,
  notFoundText: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  } as TextStyle,
  backLink: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
});
