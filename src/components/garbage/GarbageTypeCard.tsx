import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GarbageType } from '../../types/models';
import { Card } from '../common/Card';
import { borderRadius, spacing, fontSize, fontWeight } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  burnable: 'flame-outline',
  plastic: 'cube-outline',
  'non-burnable': 'construct-outline',
  petbottle: 'water-outline',
  hazardous: 'warning-outline',
};

interface GarbageTypeCardProps {
  garbageType: GarbageType;
  showRules?: boolean;
}

export function GarbageTypeCard({ garbageType, showRules = false }: GarbageTypeCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: garbageType.color + '20' }]}>
          <Ionicons
            name={ICON_MAP[garbageType.icon] ?? 'trash-outline'}
            size={24}
            color={garbageType.color}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text }]}>{garbageType.name}</Text>
          {garbageType.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {garbageType.description}
            </Text>
          )}
        </View>
      </View>
      {showRules && garbageType.rules.length > 0 && (
        <View style={styles.rulesContainer}>
          {garbageType.rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={[styles.ruleBullet, { color: garbageType.color }]}>
                {'\u2022'}
              </Text>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                {rule}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

interface NextCollectionCardProps {
  garbageType: GarbageType;
  dateLabel: string;
  daysUntilLabel: string;
  deadline?: string;
}

export function NextCollectionCard({
  garbageType,
  dateLabel,
  daysUntilLabel,
  deadline,
}: NextCollectionCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.nextCard}>
      <View style={[styles.colorStripe, { backgroundColor: garbageType.color }]} />
      <View style={styles.nextContent}>
        <View style={styles.nextLeft}>
          <Ionicons
            name={ICON_MAP[garbageType.icon] ?? 'trash-outline'}
            size={20}
            color={garbageType.color}
          />
          <Text style={[styles.nextName, { color: colors.text }]}>
            {garbageType.shortName}
          </Text>
        </View>
        <View style={styles.nextRight}>
          <Text style={[styles.nextDays, { color: garbageType.color }]}>
            {daysUntilLabel}
          </Text>
          <Text style={[styles.nextDate, { color: colors.textSecondary }]}>
            {dateLabel}
          </Text>
          {deadline && (
            <View style={styles.deadlineBadge}>
              <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
              <Text style={[styles.deadlineText, { color: colors.textSecondary }]}>
                {deadline}まで
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rulesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  ruleRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  ruleBullet: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  ruleText: {
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  // NextCollectionCard
  nextCard: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  colorStripe: {
    height: 3,
  },
  nextContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  nextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  nextRight: {
    alignItems: 'flex-end',
  },
  nextDays: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  nextDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  deadlineText: {
    fontSize: fontSize.xs,
  },
});
