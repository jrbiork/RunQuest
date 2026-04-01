import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PanResponder,
  LayoutChangeEvent,
  AccessibilityActionEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { useOnboardingDraft } from './_layout';
import { colors, spacing, fontSizes, fontWeights, radii } from '../../src/constants/theme';

const THUMB_SIZE = 30;
const TRACK_HEIGHT = 10;

export default function OnboardingFrequencyScreen() {
  const draft = useOnboardingDraft();
  const [days, setDays] = useState(draft.current.trainingDaysPerWeek ?? 3);
  const [trackWidth, setTrackWidth] = useState(0);

  const handleNext = () => {
    draft.current.trainingDaysPerWeek = days;
    router.push('/onboarding/distance' as any);
  };

  const setDaysFromX = useCallback(
    (x: number) => {
      const w = trackWidth;
      if (w <= 0) return;
      const d = Math.round((x / w) * 7);
      const next = Math.max(0, Math.min(7, d));
      setDays((prev) => {
        if (prev !== next) {
          Haptics.selectionAsync();
        }
        return next;
      });
    },
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setDaysFromX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          setDaysFromX(evt.nativeEvent.locationX);
        },
      }),
    [setDaysFromX],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const thumbLeft =
    trackWidth > 0 ? (days / 7) * Math.max(0, trackWidth - THUMB_SIZE) : 0;
  const fillWidth = trackWidth > 0 ? (days / 7) * trackWidth : 0;

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'increment':
        setDays((d) => Math.min(7, d + 1));
        break;
      case 'decrement':
        setDays((d) => Math.max(0, d - 1));
        break;
      default:
        break;
    }
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={5}
      title="How many days per week do you currently train?"
      subtitle="Training load"
      onNext={handleNext}
      nextLabel="Continue"
    >
      <View style={styles.card}>
        <View style={styles.valueBlock}>
          <Text style={styles.value}>{days}</Text>
          <Text style={styles.unit}>DAYS / WEEK</Text>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.edgeLabels}>
            <Text style={styles.edgeLabel}>0</Text>
            <Text style={styles.edgeLabel}>7</Text>
          </View>
          <View
            style={styles.trackHit}
            onLayout={onTrackLayout}
            {...panResponder.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Training days per week"
            accessibilityValue={{ min: 0, max: 7, now: days, text: `${days} days per week` }}
            accessibilityActions={[
              { name: 'increment', label: 'Increase' },
              { name: 'decrement', label: 'Decrease' },
            ]}
            onAccessibilityAction={onAccessibilityAction}
          >
            <View style={styles.trackShell}>
              <View style={styles.trackBg} />
              <View style={[styles.trackFill, { width: fillWidth }]} />
            </View>
            <View
              style={[styles.thumb, { left: thumbLeft }]}
              pointerEvents="none"
            />
          </View>
          <View style={styles.tickLabels}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Text
                key={n}
                style={[styles.tickLabel, days === n && styles.tickLabelActive]}
              >
                {n}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.quickRow}>
          {[0, 2, 3, 5, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.quickChip, days === n && styles.quickChipActive]}
              onPress={() => {
                setDays(n);
                Haptics.selectionAsync();
              }}
              accessibilityLabel={`Set to ${n} days`}
            >
              <Text style={[styles.quickChipText, days === n && styles.quickChipTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
  } as ViewStyle,
  valueBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  value: {
    fontSize: 52,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  unit: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 2,
  } as TextStyle,
  sliderBlock: {
    gap: spacing.sm,
  } as ViewStyle,
  edgeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  } as ViewStyle,
  edgeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  trackHit: {
    position: 'relative',
    justifyContent: 'center',
    minHeight: THUMB_SIZE + spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  trackShell: {
    height: TRACK_HEIGHT,
    borderRadius: radii.full,
    overflow: 'hidden',
    justifyContent: 'center',
  } as ViewStyle,
  trackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
  } as ViewStyle,
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.full,
    backgroundColor: colors.orange,
    opacity: 0.85,
  } as ViewStyle,
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.orange,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  } as ViewStyle,
  tickLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: THUMB_SIZE / 2 - 4,
  } as ViewStyle,
  tickLabel: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    width: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  tickLabelActive: {
    color: colors.primary,
    fontWeight: fontWeights.extrabold,
  } as TextStyle,
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  quickChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  } as ViewStyle,
  quickChipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  } as TextStyle,
  quickChipTextActive: {
    color: colors.orange,
  } as TextStyle,
});
