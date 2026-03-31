import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  ImageBackground,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useUserStore } from '../src/store/userStore';
import { Button } from '../src/components/ui/Button';
import { colors, fontSizes, fontWeights, spacing, radii } from '../src/constants/theme';

const WORLD_BG = require('../assets/world_dark.png');
const RUNNERS_BG = require('../assets/runners.png');
const EVERY_RUN_BG = require('../assets/every_run.png');
const FINAL_ONBOARD_BG = require('../assets/final_onboard.png');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Slide Data ───────────────────────────────────────────────────────────────

interface Slide {
  icon: string;
  iconColor: string;
  headline: string;
  body: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'power-off',
    iconColor: colors.red,
    headline: 'The world went dark.',
    body: 'Cities abandoned.\nSystems down.\nEverything silent.',
    accentColor: colors.red,
  },
  {
    icon: 'directions-run',
    iconColor: colors.orange,
    headline: 'Survivors kept it alive.',
    body: 'Moving between zones.\nCarrying what the world needs.\nOne run at a time.',
    accentColor: colors.orange,
  },
  {
    icon: 'bolt',
    iconColor: colors.yellow,
    headline: 'Every mission helps the community.',
    body: 'Deliver messages.\nCarry medication.\nAvoid being caught.',
    accentColor: colors.yellow,
  },
  {
    icon: 'public',
    iconColor: colors.primary,
    headline: 'You are a Survivor.',
    body: 'Your first mission awaits.\nThe world is counting on you.',
    accentColor: colors.primary,
  },
];

// ─── Particle lines — scan-line aesthetic ─────────────────────────────────────

function ScanLine({ delay, top }: { delay: number; top: number }) {
  const x = useSharedValue(-SCREEN_W);
  const opacity = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: opacity.value,
  }));

  // animate on mount
  opacity.value = withDelay(delay, withSequence(
    withTiming(0.18, { duration: 100 }),
    withDelay(600, withTiming(0, { duration: 300 })),
  ));
  x.value = withDelay(delay, withTiming(SCREEN_W * 2, { duration: 1200, easing: Easing.linear }));

  return (
    <Animated.View
      style={[scanStyles.line, { top }, style]}
      pointerEvents="none"
    />
  );
}

const scanStyles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    width: SCREEN_W * 0.6,
    height: 1,
    backgroundColor: colors.orange,
  } as ViewStyle,
});

// ─── Single Slide ─────────────────────────────────────────────────────────────

function SlideView({ slide, isLast, onNext, onBegin }: {
  slide: Slide;
  isLast: boolean;
  onNext: () => void;
  onBegin: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(300)}
      style={slideStyles.container}
    >
      {/* Scan lines */}
      {[0.18, 0.38, 0.55, 0.72].map((frac, i) => (
        <ScanLine key={i} delay={i * 200} top={SCREEN_H * frac} />
      ))}

      {/* Icon ring */}
      <View style={[slideStyles.iconRing, { borderColor: slide.accentColor + '40' }]}>
        <View style={[slideStyles.iconInner, { backgroundColor: slide.accentColor + '18' }]}>
          <MaterialIcons name={slide.icon as any} size={56} color={slide.iconColor} />
        </View>
      </View>

      {/* Headline */}
      <Text style={slideStyles.headline}>{slide.headline}</Text>

      {/* Body */}
      <Text style={slideStyles.body}>{slide.body}</Text>

      {/* CTA / tap hint */}
      {isLast ? (
        <Button
          label="Begin the Mission"
          onPress={onBegin}
          fullWidth
          style={slideStyles.beginBtn}
        />
      ) : (
        <TouchableWithoutFeedback onPress={onNext}>
          <View style={slideStyles.tapHint}>
            <Text style={slideStyles.tapText}>Tap to continue</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.textTertiary} />
          </View>
        </TouchableWithoutFeedback>
      )}
    </Animated.View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.xxl,
  } as ViewStyle,
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headline: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 38,
    textTransform: 'uppercase',
  } as TextStyle,
  body: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
  } as TextStyle,
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  } as ViewStyle,
  tapText: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  beginBtn: {
    marginTop: spacing.md,
  } as ViewStyle,
});

// ─── Dot indicators ───────────────────────────────────────────────────────────

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active && dotStyles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.textTertiary,
  } as ViewStyle,
  dotActive: {
    width: 20,
    backgroundColor: colors.orange,
  } as ViewStyle,
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntroScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const markIntroSeen = useUserStore((s) => s.markIntroSeen);

  const handleNext = useCallback(() => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1);
    }
  }, [slideIndex]);

  const handleBegin = useCallback(() => {
    markIntroSeen();
    router.replace('/onboarding');
  }, [markIntroSeen]);

  const slide = SLIDES[slideIndex]!;

  const isFirstSlide = slideIndex === 0;
  const isSurvivorsSlide = slideIndex === 1;
  const isMissionSlide = slideIndex === 2;
  const isFinalIntroSlide = slideIndex === 3;

  return (
    <TouchableWithoutFeedback
      onPress={slideIndex < SLIDES.length - 1 ? handleNext : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Full-screen backgrounds: world_dark, runners, every_run, final_onboard */}
        {isFirstSlide ? (
          <ImageBackground
            source={WORLD_BG}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          >
            <View style={styles.bgOverlay} />
          </ImageBackground>
        ) : null}
        {isSurvivorsSlide ? (
          <ImageBackground
            source={RUNNERS_BG}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          >
            <View style={styles.bgOverlaySurvivors} />
          </ImageBackground>
        ) : null}
        {isMissionSlide ? (
          <ImageBackground
            source={EVERY_RUN_BG}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          >
            <View style={styles.bgOverlayMission} />
          </ImageBackground>
        ) : null}
        {isFinalIntroSlide ? (
          <ImageBackground
            source={FINAL_ONBOARD_BG}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          >
            <View style={styles.bgOverlayFinal} />
          </ImageBackground>
        ) : null}

        {/* Background grid lines */}
        <View style={styles.gridOverlay} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[styles.gridLine, { top: (SCREEN_H / 8) * i }]}
            />
          ))}
        </View>

        {/* Corner brackets — cinematic frame */}
        <View style={styles.cornerTL} pointerEvents="none" />
        <View style={styles.cornerTR} pointerEvents="none" />
        <View style={styles.cornerBL} pointerEvents="none" />
        <View style={styles.cornerBR} pointerEvents="none" />

        {/* RUNQUEST wordmark */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.wordmark}>
          <Text style={styles.wordmarkText}>RUNQUEST</Text>
          <Text style={styles.wordmarkSub}>REBUILD THE WORLD</Text>
        </Animated.View>

        {/* Slide content */}
        <SlideView
          key={slideIndex}
          slide={slide}
          isLast={slideIndex === SLIDES.length - 1}
          onNext={handleNext}
          onBegin={handleBegin}
        />

        {/* Dot indicators */}
        <View style={styles.dotsWrapper}>
          <Dots count={SLIDES.length} active={slideIndex} />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const cornerSize = 20;
const cornerThickness = 2;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 8, 0.58)',
  } as ViewStyle,
  bgOverlaySurvivors: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 8, 12, 0.52)',
  } as ViewStyle,
  bgOverlayMission: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 8, 6, 0.54)',
  } as ViewStyle,
  bgOverlayFinal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 6, 0.5)',
  } as ViewStyle,

  // Subtle background grid
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.4,
  } as ViewStyle,

  // Cinematic corner brackets
  cornerTL: {
    position: 'absolute',
    top: 56,
    left: 24,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: colors.orange,
    opacity: 0.7,
  } as ViewStyle,
  cornerTR: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: colors.orange,
    opacity: 0.7,
  } as ViewStyle,
  cornerBL: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: colors.orange,
    opacity: 0.7,
  } as ViewStyle,
  cornerBR: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: colors.orange,
    opacity: 0.7,
  } as ViewStyle,

  // Wordmark at top
  wordmark: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: 2,
  } as ViewStyle,
  wordmarkText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 6,
    textTransform: 'uppercase',
  } as TextStyle,
  wordmarkSub: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.ochre,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,

  // Dots
  dotsWrapper: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  } as ViewStyle,
});
