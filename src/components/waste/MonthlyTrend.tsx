import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '../../theme/tokens';
import type { PeriodAggregation } from '../../types/waste';

interface MonthlyTrendProps {
  trend: PeriodAggregation[];
}

export function MonthlyTrend({ trend }: MonthlyTrendProps) {
  const { colors } = useTheme();

  if (trend.length === 0) return null;

  // Find max value for scaling
  const maxBags = Math.max(...trend.map((p) => p.totalBags), 1);

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {trend.map((period) => {
          const height = period.totalBags > 0 ? (period.totalBags / maxBags) * 100 : 0;
          const monthNum = period.periodKey.split('-')[1];
          const label = `${parseInt(monthNum, 10)}月`;

          return (
            <View key={period.periodKey} style={styles.barColumn}>
              <View style={styles.barArea}>
                {period.totalBags > 0 && (
                  <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                    {period.totalBags}
                  </Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(height, 4)}%`,
                      backgroundColor: period.totalBags > 0 ? tokenColors.primary : colors.surfaceSecondary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: 24,
    borderRadius: 6,
    minHeight: 4,
  },
  barValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
