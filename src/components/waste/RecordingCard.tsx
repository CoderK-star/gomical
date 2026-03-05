import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, shadow, colors as tokenColors } from '../../theme/tokens';
import { t } from '../../i18n';
import type { GarbageType } from '../../types/models';
import type { PeriodAggregation } from '../../types/waste';

interface RecordingCardProps {
  todayTypes: GarbageType[];
  monthlyAggregation: PeriodAggregation;
  garbageTypes: GarbageType[];
  onRecord: () => void;
  onViewStats: () => void;
}

export function RecordingCard({
  todayTypes,
  monthlyAggregation,
  garbageTypes,
  onRecord,
  onViewStats,
}: RecordingCardProps) {
  const { colors } = useTheme();

  const hasRecords = monthlyAggregation.recordCount > 0;

  // Build a mini summary string like "燃やす12袋 / プラ8袋"
  const summaryParts = monthlyAggregation.byType
    .filter((ta) => ta.totalBags > 0 || ta.totalKg > 0)
    .slice(0, 3)
    .map((ta) => {
      const gt = garbageTypes.find((g) => g.typeId === ta.garbageTypeId);
      const name = gt?.shortName ?? ta.garbageTypeId;
      if (ta.totalBags > 0 && ta.totalKg > 0) {
        return `${name} ${ta.totalBags}${t('waste.bagUnit')}・${ta.totalKg}kg`;
      }
      if (ta.totalBags > 0) {
        return `${name} ${ta.totalBags}${t('waste.bagUnit')}`;
      }
      return `${name} ${ta.totalKg}kg`;
    });

  // Context-aware prompt
  const prompt =
    todayTypes.length > 0
      ? t('waste.recordPrompt', { types: todayTypes.map((gt) => gt.shortName).join('・') })
      : t('waste.recordButton');

  return (
    <View style={{ marginTop: spacing.lg }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }, shadow.md]}
        onPress={onRecord}
        activeOpacity={0.7}
      >
        <View style={styles.cardMain}>
          <View style={[styles.iconCircle, { backgroundColor: tokenColors.primary + '15' }]}>
            <Ionicons name="create-outline" size={22} color={tokenColors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {prompt}
            </Text>
            {hasRecords ? (
              <Text style={[styles.cardSummary, { color: colors.textSecondary }]} numberOfLines={1}>
                {t('waste.monthlyLabel')}: {summaryParts.join(' / ')}
              </Text>
            ) : (
              <Text style={[styles.cardSummary, { color: colors.textTertiary }]}>
                {t('waste.startTracking')}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      {hasRecords && (
        <TouchableOpacity style={styles.statsLink} onPress={onViewStats}>
          <Text style={[styles.statsLinkText, { color: tokenColors.primary }]}>
            {t('waste.viewStats')}
          </Text>
          <Ionicons name="bar-chart-outline" size={14} color={tokenColors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  cardSummary: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingRight: spacing.xs,
  },
  statsLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
