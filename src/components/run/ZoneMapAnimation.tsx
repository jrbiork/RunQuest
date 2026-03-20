import { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, fontSizes, fontWeights, spacing } from '../../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// ─── Zone node layout ─────────────────────────────────────────────────────────

const SVG_W = 280;
const SVG_H = 130;

interface ZoneNode {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface ZoneEdge {
  from: number;
  to: number;
}

const NODES: ZoneNode[] = [
  { id: 0, x: 28,  y: 65,  label: 'A' },
  { id: 1, x: 80,  y: 25,  label: 'B' },
  { id: 2, x: 80,  y: 105, label: 'C' },
  { id: 3, x: 140, y: 65,  label: 'D' },
  { id: 4, x: 190, y: 25,  label: 'E' },
  { id: 5, x: 190, y: 105, label: 'F' },
  { id: 6, x: 245, y: 45,  label: 'G' },
  { id: 7, x: 245, y: 90,  label: 'H' },
];

const EDGES: ZoneEdge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 6 },
  { from: 5, to: 7 },
  { from: 6, to: 7 },
];

// ─── Animated line (edge) ─────────────────────────────────────────────────────

const LINE_TOTAL = 80; // total strokeDasharray length bucket

function AnimEdge({
  from,
  to,
  isActive,
  delay,
}: {
  from: ZoneNode;
  to: ZoneNode;
  isActive: boolean;
  delay: number;
}) {
  const dashOffset = useSharedValue(LINE_TOTAL);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    if (isActive) {
      dashOffset.value = withDelay(
        delay,
        withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }),
      );
      opacity.value = withDelay(delay, withTiming(0.9, { duration: 400 }));
    }
  }, [isActive, delay, dashOffset, opacity]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
    strokeOpacity: opacity.value,
  }));

  return (
    <AnimatedLine
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={colors.primary}
      strokeWidth={1.5}
      strokeDasharray={[LINE_TOTAL, LINE_TOTAL]}
      animatedProps={animProps}
    />
  );
}

// ─── Animated node (circle) ───────────────────────────────────────────────────

function AnimNode({
  node,
  isActive,
  isNew,
  delay,
}: {
  node: ZoneNode;
  isActive: boolean;
  isNew: boolean;
  delay: number;
}) {
  const fillOpacity = useSharedValue(isActive ? 0.8 : 0.12);
  const ringRadius = useSharedValue(10);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isNew) {
      // Light up the new node
      fillOpacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      // Expanding pulse ring
      ringRadius.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(10, { duration: 0 }),
            withTiming(22, { duration: 800, easing: Easing.out(Easing.quad) }),
          ),
          3,
          false,
        ),
      );
      ringOpacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.7, { duration: 100 }),
            withTiming(0, { duration: 700 }),
          ),
          3,
          false,
        ),
      );
    } else if (isActive) {
      // Already-active nodes pulse gently
      fillOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200 }),
          withTiming(1, { duration: 1200 }),
        ),
        -1,
        false,
      );
    }
  }, [isActive, isNew, delay, fillOpacity, ringRadius, ringOpacity]);

  const dotProps = useAnimatedProps(() => ({
    fillOpacity: fillOpacity.value,
  }));

  const ringProps = useAnimatedProps(() => ({
    r: ringRadius.value,
    strokeOpacity: ringOpacity.value,
  }));

  const nodeColor = isActive || isNew ? colors.primary : colors.border;

  return (
    <>
      {/* Pulse ring for new node */}
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        r={10}
        fill="none"
        stroke={colors.primary}
        strokeWidth={1.5}
        animatedProps={ringProps}
      />
      {/* Core dot */}
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        r={7}
        fill={nodeColor}
        animatedProps={dotProps}
      />
      {/* Inner bright dot */}
      {(isActive || isNew) && (
        <Circle
          cx={node.x}
          cy={node.y}
          r={3}
          fill="#fff"
          fillOpacity={0.9}
        />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ZoneMapAnimationProps {
  zonesOnline: number;  // how many nodes are "lit" (including the new one)
  totalZones?: number;
}

export function ZoneMapAnimation({ zonesOnline, totalZones = 12 }: ZoneMapAnimationProps) {
  // Map zonesOnline (1–12+) to node indices — clamp to NODES.length
  const litCount = Math.min(zonesOnline, NODES.length);
  const newNodeIdx = litCount - 1; // the newest node is the last lit one

  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        {/* Edges */}
        {EDGES.map((edge, i) => {
          const fromNode = NODES[edge.from]!;
          const toNode = NODES[edge.to]!;
          // Edge is active if both endpoints are lit
          const edgeActive = edge.from < litCount && edge.to < litCount;
          return (
            <AnimEdge
              key={i}
              from={fromNode}
              to={toNode}
              isActive={edgeActive}
              delay={i * 120}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node, i) => (
          <AnimNode
            key={node.id}
            node={node}
            isActive={i < litCount}
            isNew={i === newNodeIdx}
            delay={300 + i * 100}
          />
        ))}
      </Svg>

      {/* Zone counter */}
      <Text style={styles.counter}>
        <Text style={styles.counterBold}>{zonesOnline}</Text>
        <Text style={styles.counterMuted}> / {totalZones} zones online</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  counter: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  counterBold: {
    fontWeight: fontWeights.bold,
    color: colors.primary,
  } as TextStyle,
  counterMuted: {
    fontWeight: fontWeights.regular,
  } as TextStyle,
});
