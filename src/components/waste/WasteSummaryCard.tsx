import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, shadow, colors as tokenColors } from '../../theme/tokens';
import { t } from '../../i18n';
import type { PeriodAggregation } from '../../types/waste';

interface WasteSummaryCardProps {
  aggregation: PeriodAggregation;
  bagsDelta: number;
  kgDelta: number;
}

export function WasteSummaryCard({ aggregation, bagsDelta, kgDelta }: WasteSummaryCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, shadow.md]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {t('waste.monthlyTotal')}
      </Text>
      <View style={styles.statsRow}>
        {/* Bags */}
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {aggregation.totalBags}
          </Text>
          <Text style={[styles.statUnit, { color: colors.textSecondary }]}>
            {t('waste.bagUnit')}
          </Text>
          {bagsDelta !== 0 && (
            <View style={styles.deltaRow}>
              <Ionicons
                name={bagsDelta > 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={bagsDelta > 0 ? tokenColors.warning : tokenColors.success}
              />
              <Text
                style={[
                  styles.deltaText,
                  { color: bagsDelta > 0 ? tokenColors.warning : tokenColors.success },
                ]}
              >
                {Math.abs(bagsDelta)}
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Kg */}
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {aggregation.totalKg}
          </Text>
          <Text style={[styles.statUnit, { color: colors.textSecondary }]}>kg</Text>
          {kgDelta !== 0 && (
            <View style={styles.deltaRow}>
              <Ionicons
                name={kgDelta > 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={kgDelta > 0 ? tokenColors.warning : tokenColors.success}
              />
              <Text
                style={[
                  styles.deltaText,
                  { color: kgDelta > 0 ? tokenColors.warning : tokenColors.success },
                ]}
              >
                {Math.abs(kgDelta)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
  },
  statUnit: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  deltaText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  divider: {
    width: 1,
    height: 48,
    marginHorizontal: spacing.lg,
  },
});
