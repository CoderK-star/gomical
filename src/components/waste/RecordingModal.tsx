import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '../../theme/tokens';
import { useCalendar } from '../../hooks/useCalendar';
import { useWasteRecords } from '../../hooks/useWasteRecords';
import { t } from '../../i18n';
import type { GarbageType } from '../../types/models';
import type { BagSize, RecordingUnit } from '../../types/waste';

interface RecordingModalProps {
  onDismiss: () => void;
}

const BAG_SIZES: { key: BagSize; label: () => string }[] = [
  { key: 'large', label: () => t('waste.bagSizeLarge') },
  { key: 'medium', label: () => t('waste.bagSizeMedium') },
  { key: 'small', label: () => t('waste.bagSizeSmall') },
];

export function RecordingModal({ onDismiss }: RecordingModalProps) {
  const { colors } = useTheme();
  const { municipality, getTodayCollections } = useCalendar();
  const { prefs, addRecord, municipalityId } = useWasteRecords();

  const todayData = getTodayCollections();
  const garbageTypes = municipality.garbageTypes;

  // Pre-select today's first collection type, or the first type available
  const defaultTypeId = todayData?.garbageTypes[0]?.typeId ?? garbageTypes[0]?.typeId ?? '';

  const [selectedTypeId, setSelectedTypeId] = useState(defaultTypeId);
  const [unit, setUnit] = useState<RecordingUnit>(prefs.defaultUnit);
  const [bagSize, setBagSize] = useState<BagSize>(prefs.defaultBagSize);
  const [amount, setAmount] = useState(1);
  const [kgInput, setKgInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedType = useMemo(
    () => garbageTypes.find((gt) => gt.typeId === selectedTypeId),
    [garbageTypes, selectedTypeId],
  );

  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const canSave = selectedTypeId && (unit === 'bags' ? amount > 0 : parseFloat(kgInput) > 0);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await addRecord({
      date: todayISO,
      municipalityId: municipalityId ?? '',
      garbageTypeId: selectedTypeId,
      unit,
      amount: unit === 'bags' ? amount : parseFloat(kgInput),
      bagSize: unit === 'bags' ? bagSize : undefined,
      note: note.trim() || undefined,
    });

    onDismiss();
  }

  function incrementAmount() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount((a) => a + 1);
  }

  function decrementAmount() {
    if (amount <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount((a) => a - 1);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('waste.recordButton')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Selection */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('waste.category')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {garbageTypes.map((gt) => {
            const isSelected = gt.typeId === selectedTypeId;
            return (
              <TouchableOpacity
                key={gt.typeId}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? gt.color + '30' : colors.surfaceSecondary,
                    borderColor: isSelected ? gt.color : 'transparent',
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setSelectedTypeId(gt.typeId)}
              >
                <View style={[styles.chipDot, { backgroundColor: gt.color }]} />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? gt.color : colors.textSecondary },
                  ]}
                >
                  {gt.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Unit Toggle */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.xl }]}>
          {t('waste.unit')}
        </Text>
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              unit === 'bags' && {
                backgroundColor: colors.surface,
                ...styles.toggleActive,
              },
            ]}
            onPress={() => setUnit('bags')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: unit === 'bags' ? colors.text : colors.textSecondary },
                unit === 'bags' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {t('waste.bags')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              unit === 'kg' && {
                backgroundColor: colors.surface,
                ...styles.toggleActive,
              },
            ]}
            onPress={() => setUnit('kg')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: unit === 'kg' ? colors.text : colors.textSecondary },
                unit === 'kg' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {t('waste.kg')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.xl }]}>
          {t('waste.amount')}
        </Text>

        {unit === 'bags' ? (
          <>
            {/* Bag Size Selector */}
            <View style={styles.bagSizeRow}>
              {BAG_SIZES.map((bs) => {
                const isSelected = bs.key === bagSize;
                return (
                  <TouchableOpacity
                    key={bs.key}
                    style={[
                      styles.bagSizeButton,
                      {
                        backgroundColor: isSelected
                          ? tokenColors.primary + '20'
                          : colors.surfaceSecondary,
                        borderColor: isSelected ? tokenColors.primary : 'transparent',
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setBagSize(bs.key)}
                  >
                    <Text
                      style={[
                        styles.bagSizeText,
                        { color: isSelected ? tokenColors.primary : colors.textSecondary },
                      ]}
                    >
                      {bs.label()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stepper */}
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.surfaceSecondary },
                  amount <= 1 && { opacity: 0.4 },
                ]}
                onPress={decrementAmount}
                disabled={amount <= 1}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: colors.text }]}>{amount}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={incrementAmount}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* kg input */
          <View style={[styles.kgInputRow, { backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.kgInput, { color: colors.text }]}
              value={kgInput}
              onChangeText={setKgInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.kgUnit, { color: colors.textSecondary }]}>kg</Text>
          </View>
        )}

        {/* Note */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.xl }]}>
          {t('waste.note')}
        </Text>
        <TextInput
          style={[
            styles.noteInput,
            {
              backgroundColor: colors.surfaceSecondary,
              color: colors.text,
            },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder={t('waste.notePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={100}
        />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? tokenColors.primary : tokenColors.primary + '50' },
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{t('waste.save')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleActive: Platform.select({
    web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  toggleText: {
    fontSize: fontSize.md,
  },
  bagSizeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bagSizeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  bagSizeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    minWidth: 60,
    textAlign: 'center',
  },
  kgInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  kgInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  kgUnit: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
  noteInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
