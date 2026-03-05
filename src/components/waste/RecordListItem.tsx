import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';
import { t } from '../../i18n';
import type { WasteRecord, BagSize } from '../../types/waste';
import type { GarbageType } from '../../types/models';

interface RecordListItemProps {
  record: WasteRecord;
  garbageType?: GarbageType;
  onDelete: (id: string) => void;
}

const BAG_SIZE_LABELS: Record<BagSize, string> = {
  large: '大',
  medium: '中',
  small: '小',
};

export function RecordListItem({ record, garbageType, onDelete }: RecordListItemProps) {
  const { colors } = useTheme();
  const color = garbageType?.color ?? '#999';
  const name = garbageType?.shortName ?? record.garbageTypeId;

  const valueText =
    record.unit === 'bags'
      ? `${record.amount}袋（${BAG_SIZE_LABELS[record.bagSize ?? 'medium']}）`
      : `${record.amount}kg`;

  // Format date: "1/15" style
  const parts = record.date.split('-');
  const dateLabel = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

  function handleDelete() {
    Alert.alert(t('waste.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(record.id) },
    ]);
  }

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.value, { color: colors.textSecondary }]}>{valueText}</Text>
      </View>
      <Text style={[styles.date, { color: colors.textTertiary }]}>{dateLabel}</Text>
      <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  date: {
    fontSize: fontSize.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
});
