import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GarbageType } from '../../types/models';
import { borderRadius, spacing, fontSize, fontWeight } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  burnable: 'flame-outline',
  plastic: 'cube-outline',
  'non-burnable': 'construct-outline',
  petbottle: 'water-outline',
  hazardous: 'warning-outline',
};

interface GarbageBadgeProps {
  garbageType: GarbageType;
  size?: 'sm' | 'md' | 'lg';
}

export function GarbageBadge({ garbageType, size = 'md' }: GarbageBadgeProps) {
  const sizeConfig = SIZES[size];

  return (
    <View style={[styles.badge, { backgroundColor: garbageType.color + '25' }, sizeConfig.container]}>
      <Ionicons
        name={ICON_MAP[garbageType.icon] ?? 'trash-outline'}
        size={sizeConfig.icon}
        color={garbageType.color}
      />
      <Text style={[styles.badgeText, { color: garbageType.color }, sizeConfig.text]}>
        {garbageType.shortName}
      </Text>
    </View>
  );
}

const SIZES = {
  sm: {
    container: { paddingHorizontal: spacing.sm, paddingVertical: 3, gap: 3 },
    icon: 12,
    text: { fontSize: fontSize.xs },
  },
  md: {
    container: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
    icon: 16,
    text: { fontSize: fontSize.sm },
  },
  lg: {
    container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
    icon: 20,
    text: { fontSize: fontSize.md },
  },
} as const;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontWeight: fontWeight.semibold,
  },
});
