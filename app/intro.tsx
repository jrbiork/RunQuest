import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
  PanResponder,
  ViewStyle,
  TextStyle,
  type ImageSourcePropType,
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
  withRepeat,
  Easing,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useUserStore } from '../src/store/userStore';
import {
  startOnboardingAmbient,
  syncOnboardingAmbientWithMute,
} from '../src/services/audioService';
import { Button } from '../src/components/ui/Button';
import {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  radii,
} from '../src/constants/theme';

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
  bg: ImageSourcePropType;
  bgOverlay: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'power-off',
    iconColor: colors.earthGreen,
    headline: 'The world went dark.',
    body: 'Cities abandoned.\nSystems down.\nEverything silent.',
    accentColor: colors.earthGreen,
    bg: WORLD_BG,
    bgOverlay: 'rgba(8, 12, 8, 0.58)',
  },
  {
    icon: 'directions-run',
    iconColor: colors.earthGreen,
    headline: 'Survivors kept it alive.',
    body: 'Moving between zones.\nCarrying what the world needs.\nOne run at a time.',
    accentColor: colors.earthGreen,
    bg: RUNNERS_BG,
    bgOverlay: 'rgba(6, 8, 12, 0.52)',
  },
  {
    icon: 'bolt',
    iconColor: colors.earthGreen,
    headline: 'Every mission helps the community.',
    body: 'Deliver messages.\nCarry medication.\nAvoid being caught.',
    accentColor: colors.earthGreen,
    bg: EVERY_RUN_BG,
    bgOverlay: 'rgba(10, 8, 6, 0.54)',
  },
  {
    icon: 'public',
    iconColor: colors.earthGreen,
    headline: 'You are a Survivor.',
    body: 'Your first mission awaits.\nThe world is counting on you.',
    accentColor: colors.earthGreen,
    bg: FINAL_ONBOARD_BG,
    bgOverlay: 'rgba(4, 8, 6, 0.5)',
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
  opacity.value = withDelay(
    delay,
    withSequence(
      withTiming(0.18, { duration: 100 }),
      withDelay(600, withTiming(0, { duration: 300 })),
    ),
  );
  x.value = withDelay(
    delay,
    withTiming(SCREEN_W * 2, { duration: 1200, easing: Easing.linear }),
  );

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
    backgroundColor: colors.earthGreen,
  } as ViewStyle,
});

/** Looping finger sliding left to reinforce “swipe left”. */
function SwipeFingerCue() {
  const x = useSharedValue(22);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    x.value = withRepeat(
      withSequence(
        withTiming(-34, { duration: 580, easing: Easing.out(Easing.cubic) }),
        withDelay(280, withTiming(22, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [x]);

  const fingerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={fingerCue.track} pointerEvents="none">
      <Animated.View style={[fingerCue.fingerWrap, fingerStyle]}>
        <MaterialIcons name="touch-app" size={30} color={colors.earthGreen} />
      </Animated.View>
    </View>
  );
}

const fingerCue = StyleSheet.create({
  track: {
    width: 88,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  } as ViewStyle,
  fingerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});

// ─── Single Slide ─────────────────────────────────────────────────────────────

function SlideView({
  slide,
  isLast,
  onBegin,
}: {
  slide: Slide;
  isLast: boolean;
  onBegin: () => void;
}) {
  return (
    <Animated.View
      entering={SlideInRight.duration(380)}
      exiting={SlideOutLeft.duration(280)}
      style={slideStyles.container}
    >
      {/* Full-bleed background — travels with the slide */}
      <ImageBackground
        source={slide.bg}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: slide.bgOverlay },
          ]}
        />
      </ImageBackground>

      {/* Scan lines */}
      {[0.18, 0.38, 0.55, 0.72].map((frac, i) => (
        <ScanLine key={i} delay={i * 200} top={SCREEN_H * frac} />
      ))}

      {/* Icon ring */}
      <View
        style={[
          slideStyles.iconRing,
          { borderColor: slide.accentColor + '40' },
        ]}
      >
        <View
          style={[
            slideStyles.iconInner,
            { backgroundColor: slide.accentColor + '18' },
          ]}
        >
          <MaterialIcons
            name={slide.icon as any}
            size={56}
            color={slide.iconColor}
          />
        </View>
      </View>

      {/* Headline */}
      <Text style={slideStyles.headline}>{slide.headline}</Text>

      {/* Body */}
      <Text style={slideStyles.body}>{slide.body}</Text>

      {/* CTA / swipe hint */}
      {isLast ? (
        <Button
          label="Begin your journey"
          onPress={onBegin}
          variant="accent"
          fullWidth
          style={slideStyles.beginBtn}
        />
      ) : (
        <View
          style={slideStyles.swipeHint}
          accessibilityLabel="Swipe left to continue"
        >
          <SwipeFingerCue />
          <View style={slideStyles.swipeHintRow}>
            <MaterialIcons
              name="arrow-back"
              size={18}
              color={colors.textTertiary}
            />
            <Text style={slideStyles.swipeHintText}>
              Swipe left to continue
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
  swipeHint: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  swipeHintText: {
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
          style={[dotStyles.dot, i === active && dotStyles.dotActive]}
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
    backgroundColor: colors.earthGreen,
  } as ViewStyle,
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntroScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const markIntroSeen = useUserStore((s) => s.markIntroSeen);
  const audioMuted = useUserStore((s) => s.audioMuted);

  const swipeForward = useCallback(() => {
    setSlideIndex((i) => (i < SLIDES.length - 1 ? i + 1 : i));
  }, []);

  const isLastSlide = slideIndex === SLIDES.length - 1;

  // Refs so PanResponder always reads the latest values without recreating.
  const swipeForwardRef = useRef(swipeForward);
  swipeForwardRef.current = swipeForward;
  const isLastSlideRef = useRef(isLastSlide);
  isLastSlideRef.current = isLastSlide;

  /** Swipe left anywhere on the screen to advance (disabled on final slide). */
  const panResponder = useRef(
    PanResponder.create({
      // Claim the responder immediately on slides 1–3 so move events are received.
      // On the final slide stay hands-off so the "Begin" button works normally.
      onStartShouldSetPanResponder: () => !isLastSlideRef.current,
      onMoveShouldSetPanResponder: () => !isLastSlideRef.current,
      onPanResponderRelease: (_, gs) => {
        if (!isLastSlideRef.current && gs.dx < -30) {
          swipeForwardRef.current();
        }
      },
    }),
  ).current;

  /** Ambient bed: plays through all intro slides until “Begin your journey”. */
  useEffect(() => {
    startOnboardingAmbient();
  }, []);

  useEffect(() => {
    syncOnboardingAmbientWithMute();
  }, [audioMuted]);

  const handleBegin = useCallback(() => {
    markIntroSeen();
    router.replace('/onboarding');
  }, [markIntroSeen]);

  const slide = SLIDES[slideIndex]!;

  return (
    <View style={styles.gestureHost} {...panResponder.panHandlers}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gestureFill}>
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

          {/* Slide content */}
          <SlideView
            key={slideIndex}
            slide={slide}
            isLast={slideIndex === SLIDES.length - 1}
            onBegin={handleBegin}
          />

          {/* RUNQUEST wordmark — rendered after SlideView so it sits above the image background */}
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.wordmark}
            pointerEvents="none"
          >
            <Text style={styles.wordmarkText}>RUNQUEST</Text>
            <Text style={styles.wordmarkSub}>REBUILD THE WORLD</Text>
          </Animated.View>

          {/* Dot indicators */}
          <View style={styles.dotsWrapper}>
            <Dots count={SLIDES.length} active={slideIndex} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const cornerSize = 20;
const cornerThickness = 2;

const styles = StyleSheet.create({
  gestureHost: {
    flex: 1,
  } as ViewStyle,
  gestureFill: {
    flex: 1,
    overflow: 'hidden',
  } as ViewStyle,
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderColor: colors.earthGreen,
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
    borderColor: colors.earthGreen,
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
    borderColor: colors.earthGreen,
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
    borderColor: colors.earthGreen,
    opacity: 0.7,
  } as ViewStyle,

  // Wordmark — floats above slide image backgrounds
  wordmark: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
    zIndex: 10,
  } as ViewStyle,
  wordmarkText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.earthGreen,
    letterSpacing: 6,
    textTransform: 'uppercase',
  } as TextStyle,
  wordmarkSub: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.earthGreen,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,

  // Dots
  dotsWrapper: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
});
