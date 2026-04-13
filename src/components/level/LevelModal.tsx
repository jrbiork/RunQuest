import { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getScavengerLevelRows } from '../../utils/xpCalculator';
import type { LevelInfo } from '../../types';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
} from '../../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
};

/**
 * Full-screen dimmed modal listing all levels and XP thresholds (home + profile).
 */
export function LevelModal({ visible, onClose, levelInfo }: Props) {
  const scavengerLevels = useMemo(() => getScavengerLevelRows(), []);
  const listRef = useRef<FlatList<(typeof scavengerLevels)[number]>>(null);
  const currentLevelIndex = useMemo(
    () => Math.max(0, scavengerLevels.findIndex((row) => row.level === levelInfo.level)),
    [scavengerLevels, levelInfo.level],
  );
  const ROW_HEIGHT = 58;

  const scrollCurrentLevelIntoView = useCallback(
    (animated: boolean) => {
      listRef.current?.scrollToIndex({
        index: currentLevelIndex,
        animated,
        viewPosition: 0.5,
      });
    },
    [currentLevelIndex],
  );

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      scrollCurrentLevelIntoView(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, scrollCurrentLevelIntoView]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.modalBackdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Levels</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={listRef}
            data={scavengerLevels}
            keyExtractor={(row) => String(row.level)}
            renderItem={({ item: row }) => {
              const current = row.level === levelInfo.level;
              return (
                <View style={[styles.levelRow, current && styles.levelRowCurrent]}>
                  <Text
                    style={[
                      styles.levelRowNum,
                      current && styles.levelRowNumCurrent,
                      { color: row.accentColor },
                    ]}
                  >
                    {row.level}
                  </Text>
                  <View style={styles.levelRowText}>
                    <Text
                      style={[
                        styles.levelRowTitle,
                        current && styles.levelRowTitleCurrent,
                      ]}
                    >
                      {row.title}
                    </Text>
                    <Text style={styles.levelRowXp}>
                      {row.minXp.toLocaleString()} XP to reach
                    </Text>
                  </View>
                  {current && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={colors.earthGreen}
                    />
                  )}
                </View>
              );
            }}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            onScrollToIndexFailed={() => {
              setTimeout(() => {
                scrollCurrentLevelIntoView(false);
              }, 50);
            }}
            ListHeaderComponent={
              <Text style={styles.modalSub}>
                Earn XP from missions to promote through each level.
              </Text>
            }
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  } as ViewStyle,
  modalBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  } as ViewStyle,
  modalCard: {
    maxHeight: '72%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  modalTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  } as TextStyle,
  modalScroll: {
    maxHeight: 420,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } as ViewStyle,
  modalSub: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    lineHeight: 18,
  } as TextStyle,
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  levelRowCurrent: {
    borderColor: colors.earthGreen,
    backgroundColor: colors.earthGreenLight,
  } as ViewStyle,
  levelRowNum: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    width: 28,
  } as TextStyle,
  levelRowNumCurrent: {
    color: colors.earthGreen,
  } as TextStyle,
  levelRowText: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  levelRowTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  levelRowTitleCurrent: {
    color: colors.earthGreen,
  } as TextStyle,
  levelRowXp: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  } as TextStyle,
});
