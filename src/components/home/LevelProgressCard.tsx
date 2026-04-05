import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { LevelBadge } from '../ui/LevelBadge';
import { colors, spacing, fontSizes, fontWeights } from '../../constants/theme';
import type { LevelInfo } from '../../types';

interface LevelProgressCardProps {
  levelInfo: LevelInfo;
}

export function LevelProgressCard({ levelInfo }: LevelProgressCardProps) {
  const { level, title, xpInLevel, xpToNextLevel, progress } = levelInfo;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <LevelBadge level={level} size="lg" />
        <View style={styles.info}>
          <Text style={styles.levelTitle}>{title}</Text>
          <Text style={styles.xpText}>
            <Text style={styles.xpBold}>{xpInLevel}</Text>
            <Text style={styles.xpDim}> / {xpToNextLevel} XP to level {level + 1}</Text>
          </Text>
        </View>
      </View>

      <ProgressBar
        progress={progress}
        color={colors.primary}
        backgroundColor={colors.primaryLight}
        height={8}
        style={styles.bar}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  } as ViewStyle,
  info: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  levelTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  xpText: {
    fontSize: fontSizes.sm,
  } as TextStyle,
  xpBold: {
    fontWeight: fontWeights.bold,
    color: colors.primary,
  } as TextStyle,
  xpDim: {
    color: colors.textSecondary,
  } as TextStyle,
  bar: {} as ViewStyle,
});
