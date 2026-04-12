import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../constants/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// ─── Building / Window definitions ───────────────────────────────────────────

interface BuildingDef {
  x: number;
  width: number;
  height: number;
  windows: WindowDef[];
}

interface WindowDef {
  wx: number; // relative to building x
  wy: number; // from top
  ww: number;
  wh: number;
  delay: number;
  color: string;
}

const SVG_W = 340;
const SVG_H = 160;
const GROUND_Y = SVG_H - 10;

const W_COLORS = [
  colors.orange,
  colors.primary,
  colors.orange,
  colors.primary,
  colors.orange,
  colors.primary,
];

function makeWindows(
  x: number,
  bw: number,
  bh: number,
  cols: number,
  rows: number,
  baseDelay: number,
): WindowDef[] {
  const wins: WindowDef[] = [];
  const ww = Math.max(4, Math.floor((bw - 6) / cols) - 2);
  const wh = 4;
  const hGap = Math.floor((bh - 4) / rows);
  const vGap = Math.floor((bw - 4) / cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      wins.push({
        wx: 3 + c * vGap,
        wy: 4 + r * hGap,
        ww,
        wh,
        delay: baseDelay + (r * cols + c) * 80 + Math.random() * 200,
        color: W_COLORS[Math.floor(Math.random() * W_COLORS.length)] as string,
      });
    }
  }
  return wins;
}

const BUILDINGS: BuildingDef[] = [
  { x: 0, width: 32, height: 90, windows: makeWindows(0, 32, 90, 2, 7, 0) },
  { x: 36, width: 24, height: 60, windows: makeWindows(36, 24, 60, 2, 5, 150) },
  {
    x: 64,
    width: 44,
    height: 120,
    windows: makeWindows(64, 44, 120, 3, 9, 300),
  },
  {
    x: 112,
    width: 28,
    height: 72,
    windows: makeWindows(112, 28, 72, 2, 6, 100),
  },
  {
    x: 144,
    width: 20,
    height: 48,
    windows: makeWindows(144, 20, 48, 1, 4, 500),
  },
  {
    x: 168,
    width: 38,
    height: 100,
    windows: makeWindows(168, 38, 100, 3, 8, 200),
  },
  {
    x: 210,
    width: 26,
    height: 80,
    windows: makeWindows(210, 26, 80, 2, 6, 400),
  },
  {
    x: 240,
    width: 34,
    height: 110,
    windows: makeWindows(240, 34, 110, 2, 8, 50),
  },
  {
    x: 278,
    width: 22,
    height: 65,
    windows: makeWindows(278, 22, 65, 1, 5, 350),
  },
  {
    x: 304,
    width: 36,
    height: 88,
    windows: makeWindows(304, 36, 88, 2, 7, 600),
  },
];

// ─── Animated window ─────────────────────────────────────────────────────────

function AnimWindow({ win, bx }: { win: WindowDef; bx: number }) {
  const opacity = useSharedValue(0.06);

  useEffect(() => {
    opacity.value = withDelay(
      win.delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
  }, [opacity, win.delay]);

  const animProps = useAnimatedProps(() => ({
    fillOpacity: opacity.value,
  }));

  return (
    <AnimatedRect
      x={bx + win.wx}
      y={GROUND_Y - win.wy - win.wh}
      width={win.ww}
      height={win.wh}
      fill={win.color}
      animatedProps={animProps}
    />
  );
}

// ─── Scan glow line ────────────────────────────────────────────────────────────

function GlowSweep() {
  const y = useSharedValue(GROUND_Y);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      200,
      withSequence(
        withTiming(0.5, { duration: 100 }),
        withDelay(1200, withTiming(0, { duration: 400 })),
      ),
    );
    y.value = withDelay(
      200,
      withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
    );
  }, [y, opacity]);

  const glowProps = useAnimatedProps(() => ({
    y1: y.value,
    y2: y.value,
    strokeOpacity: opacity.value,
  }));

  return (
    <AnimatedLine
      x1={0}
      x2={SVG_W}
      stroke={colors.primary}
      strokeWidth={1.5}
      animatedProps={glowProps}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CityRestoreAnimation() {
  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        {/* Ground line */}
        <Rect
          x={0}
          y={GROUND_Y}
          width={SVG_W}
          height={2}
          fill={colors.border}
        />

        {/* Buildings */}
        {BUILDINGS.map((b, bi) => (
          <Rect
            key={`b${bi}`}
            x={b.x}
            y={GROUND_Y - b.height}
            width={b.width}
            height={b.height}
            fill="#1A1A2A"
            stroke={colors.border}
            strokeWidth={0.5}
          />
        ))}

        {/* Windows — animated */}
        {BUILDINGS.map((b, bi) =>
          b.windows.map((w, wi) => (
            <AnimWindow key={`w${bi}-${wi}`} win={w} bx={b.x} />
          )),
        )}

        {/* Sweep glow line */}
        <GlowSweep />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as ViewStyle,
});
