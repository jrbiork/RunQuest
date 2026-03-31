import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../constants/theme';
import { Button } from '../ui/Button';

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  /** Shown as an ochre "classification label" above the title */
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  /** When true, the SafeAreaView background is transparent so a parent ImageBackground shows through */
  transparent?: boolean;
}

export function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  transparent = false,
}: OnboardingLayoutProps) {
  return (
    <SafeAreaView style={[styles.safe, transparent && styles.safeTransparent]} edges={['top', 'bottom']}>
      {/* Subtle horizontal grid lines — distressed texture */}
      {[0.15, 0.35, 0.55, 0.75].map((frac) => (
        <View key={frac} style={[styles.gridLine, { top: `${frac * 100}%` as any }]} pointerEvents="none" />
      ))}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {showBack ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          {/* TRANSMISSION badge */}
          <View style={styles.transmissionBadge}>
            <MaterialIcons name="wifi" size={11} color={colors.orange} />
            <Text style={styles.transmissionText}>
              TRANSMISSION {step} / {totalSteps}
            </Text>
          </View>

          <View style={styles.backBtn} />
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < step - 1 ? styles.dotDone : i === step - 1 ? styles.dotActive : styles.dotEmpty,
              ]}
            />
          ))}
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {subtitle && (
              <Text style={styles.classificationLabel}>{subtitle}</Text>
            )}
            <Text style={styles.title}>{title}</Text>
          </View>

          {children}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Button
            label={nextLabel}
            onPress={onNext}
            disabled={nextDisabled}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  } as ViewStyle,
  safeTransparent: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,

  // Background grid texture
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.25,
  } as ViewStyle,

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } as ViewStyle,
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Transmission badge
  transmissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.orange,
  } as ViewStyle,
  transmissionText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  } as ViewStyle,
  dot: {
    height: 4,
    borderRadius: radii.full,
  } as ViewStyle,
  dotActive: {
    width: 20,
    backgroundColor: colors.orange,
  } as ViewStyle,
  dotDone: {
    width: 8,
    backgroundColor: colors.primary,
  } as ViewStyle,
  dotEmpty: {
    width: 8,
    backgroundColor: colors.border,
  } as ViewStyle,

  // Scroll
  scroll: { flex: 1 } as ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  } as ViewStyle,

  // Header
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  } as ViewStyle,
  classificationLabel: {
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

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
});
