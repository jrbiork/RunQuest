import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { useOnboardingDraft } from './_layout';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import type { ActivityMode, UserProfile } from '../../src/types';
import { colors, spacing, radii, fontSizes, fontWeights, shadows } from '../../src/constants/theme';

const MODES: { value: ActivityMode; label: string; description: string; icon: string }[] = [
  {
    value: 'run',
    label: 'RUNNING',
    description: 'On foot. Every step restores a zone.',
    icon: 'directions-run',
  },
  {
    value: 'cycle',
    label: 'CYCLING',
    description: 'On wheels. Cover more ground, faster.',
    icon: 'directions-bike',
  },
];

export default function ModeScreen() {
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<ActivityMode>(
    draft.current.defaultActivityMode ?? 'run',
  );

  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const initCampaign = useMissionsStore((s) => s.initCampaign);

  const handleDeploy = () => {
    const personaId = draft.current.personaId;
    const preferredDays = draft.current.preferredDays;
    if (!personaId || !preferredDays || preferredDays.length === 0) return;

    const profile: UserProfile = {
      personaId,
      defaultActivityMode: selected,
      preferredDays,
      weeklyTargetRuns: preferredDays.length,
    };

    completeOnboarding(profile);
    initCampaign(profile);
    router.replace('/(tabs)');
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={3}
      title="Default Mode"
      subtitle="Primary Activity Type"
      onNext={handleDeploy}
      nextLabel="Deploy Operative"
      nextDisabled={false}
    >
      <View style={styles.options}>
        {MODES.map((mode) => {
          const isSelected = selected === mode.value;
          return (
            <TouchableOpacity
              key={mode.value}
              style={[styles.modeCard, isSelected && styles.modeCardActive]}
              onPress={() => setSelected(mode.value)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapActive]}>
                <MaterialIcons
                  name={mode.icon as any}
                  size={32}
                  color={isSelected ? colors.textInverse : colors.textSecondary}
                />
              </View>
              <View style={styles.modeText}>
                <Text style={[styles.modeLabel, isSelected && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
                <Text style={styles.modeDesc}>{mode.description}</Text>
              </View>
              {isSelected && (
                <View style={styles.checkBox}>
                  <MaterialIcons name="check" size={14} color={colors.textInverse} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.note}>
        <MaterialIcons name="info-outline" size={14} color={colors.textTertiary} />
        <Text style={styles.noteText}>
          You can change your default mode at any time in settings.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  } as ViewStyle,
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  modeCardActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  } as ViewStyle,
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconWrapActive: {
    backgroundColor: colors.orange,
  } as ViewStyle,
  modeText: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  modeLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  modeLabelActive: {
    color: colors.orange,
  } as TextStyle,
  modeDesc: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    lineHeight: 18,
  } as TextStyle,
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.md,
  } as ViewStyle,
  noteText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  } as TextStyle,
});
