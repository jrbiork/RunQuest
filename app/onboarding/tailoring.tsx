import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../src/constants/theme';
import { PERSONA_LABELS } from '../../src/constants/campaigns';
import { EXPERIENCE_DISPLAY_LABELS } from '../../src/constants/experienceDisplay';
import { getLevelInfo } from '../../src/utils/xpCalculator';
import { countPersonaPath } from '../../src/utils/personaCampaignStats';
import { personaLabelTitleCase } from '../../src/utils/personaDisplay';

const TAILOR_MS = 2400;
const TICK_MS = 48;

export default function OnboardingTailoringScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const [progress, setProgress] = useState(0);
  const [phaseDone, setPhaseDone] = useState(false);

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

  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const personaId = profile?.personaId;
  const personaMeta = personaId ? PERSONA_LABELS[personaId] : null;
  const pathStats = personaId ? countPersonaPath(personaId) : null;
  const expLabel =
    profile?.experienceLevel != null
      ? EXPERIENCE_DISPLAY_LABELS[profile.experienceLevel]
      : '—';

  if (!profile?.personaId || !personaMeta || !pathStats) {
    return null;
  }

  const personaTitle = personaLabelTitleCase(personaMeta.label);

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
          <Text style={styles.badgeText}>TRANSMISSION 6 / 6</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.kicker}>CALIBRATION</Text>
          <Text style={styles.title}>Tailoring your missions</Text>
          <Text style={styles.sub}>
            Based on your answers, we are assigning your operative path and objectives.
          </Text>
        </View>

        <View style={styles.progressBlock}>
          <ProgressBar progress={progress} color={colors.primary} height={8} />
        </View>

        {phaseDone && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <MaterialIcons name="military-tech" size={20} color={colors.primary} />
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Level</Text>
                <Text style={styles.summaryValue}>
                  Level {levelInfo.level} · {levelInfo.title}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name={personaMeta.icon as any} size={20} color={colors.orange} />
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Persona</Text>
                <Text style={styles.summaryValue}>{personaTitle}</Text>
                <Text style={styles.summaryDesc}>{personaMeta.description}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="school" size={20} color={colors.textSecondary} />
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Experience</Text>
                <Text style={styles.summaryValue}>{expLabel}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <MaterialIcons name="map" size={20} color={colors.textSecondary} />
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Path ahead</Text>
                <Text style={styles.summaryValue}>
                  {pathStats.campaignCount} campaigns · {pathStats.missionCount} missions
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Enter base"
          onPress={() => router.replace('/(tabs)')}
          fullWidth
          disabled={!phaseDone}
        />
      </View>
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
  progressBlock: {
    marginTop: spacing.md,
  } as ViewStyle,
  summary: {
    marginTop: spacing.xl,
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
});
