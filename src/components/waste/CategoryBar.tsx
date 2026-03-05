import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';
import type { GarbageType } from '../../types/models';
import type { TypeAggregation } from '../../types/waste';

interface CategoryBarProps {
  aggregation: TypeAggregation;
  garbageType?: GarbageType;
  maxValue: number;
}

export function CategoryBar({ aggregation, garbageType, maxValue }: CategoryBarProps) {
  const { colors } = useTheme();
  const color = garbageType?.color ?? '#999';
  const name = garbageType?.shortName ?? aggregation.garbageTypeId;

  const hasBags = aggregation.totalBags > 0;
  const hasKg = aggregation.totalKg > 0;
  const displayValue = hasBags ? aggregation.totalBags : aggregation.totalKg;
  const percentage = maxValue > 0 ? (displayValue / maxValue) * 100 : 0;

  let valueText = '';
  if (hasBags && hasKg) {
    valueText = `${aggregation.totalBags}袋 / ${aggregation.totalKg}kg`;
  } else if (hasBags) {
    valueText = `${aggregation.totalBags}袋`;
  } else {
    valueText = `${aggregation.totalKg}kg`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        </View>
        <Text style={[styles.value, { color: colors.textSecondary }]}>{valueText}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: `${Math.max(percentage, 2)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: fontSize.sm,
  },
  barTrack: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    opacity: 0.7,
  },
});
