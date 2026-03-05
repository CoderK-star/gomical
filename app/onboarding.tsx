import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/src/store/settingsStore';
import { getMunicipalityGroupedByPrefecture, loadMunicipalityById } from '@/src/data/registry';
import type { MunicipalityEntry, PrefectureGroup } from '@/src/data/registry';
import type { Area } from '@/src/types/models';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';

type Step = 'prefecture' | 'municipality' | 'area';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const update = useSettingsStore((s) => s.update);

  const prefectureGroups = useMemo(() => getMunicipalityGroupedByPrefecture(), []);

  const [step, setStep] = useState<Step>('prefecture');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityEntry | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const municipalitiesInPrefecture = useMemo(() => {
    if (!selectedPrefecture) return [];
    return prefectureGroups.find((g) => g.prefecture === selectedPrefecture)?.municipalities ?? [];
  }, [selectedPrefecture, prefectureGroups]);

  const areas: Area[] = useMemo(() => {
    if (!selectedMunicipality) return [];
    const data = loadMunicipalityById(selectedMunicipality.id);
    return data?.areas ?? [];
  }, [selectedMunicipality]);

  function handlePrefectureSelect(prefecture: string) {
    setSelectedPrefecture(prefecture);
    const group = prefectureGroups.find((g) => g.prefecture === prefecture);
    if (group && group.municipalities.length === 1) {
      setSelectedMunicipality(group.municipalities[0]);
      setStep('area');
    } else {
      setStep('municipality');
    }
  }

  function handleMunicipalitySelect(entry: MunicipalityEntry) {
    setSelectedMunicipality(entry);
    setSelectedAreaId(null);
    setStep('area');
  }

  function handleBack() {
    if (step === 'area') {
      if (municipalitiesInPrefecture.length <= 1) {
        setStep('prefecture');
        setSelectedPrefecture(null);
      } else {
        setStep('municipality');
      }
      setSelectedAreaId(null);
    } else if (step === 'municipality') {
      setStep('prefecture');
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
    }
  }

  async function handleComplete() {
    if (!selectedMunicipality || !selectedAreaId) return;
    await update({
      selectedMunicipalityId: selectedMunicipality.id,
      selectedAreaId,
      onboardingComplete: true,
    });
    router.replace('/');
  }

  const stepTitle: Record<Step, string> = {
    prefecture: '都道府県を選択',
    municipality: '市区町村を選択',
    area: '地区を選択',
  };

  const stepSubtitle: Record<Step, string> = {
    prefecture: 'お住まいの都道府県を選んでください',
    municipality: `${selectedPrefecture ?? ''}の市区町村を選んでください`,
    area: `${selectedMunicipality?.name ?? ''}の地区を選んでください`,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {step !== 'prefecture' && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>ようこそ！</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {stepTitle[step]}
            </Text>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {stepSubtitle[step]}
            </Text>
          </View>
        </View>
        <StepIndicator current={step} />
      </View>

      {step === 'prefecture' && (
        <FlatList
          data={prefectureGroups}
          keyExtractor={(item) => item.prefecture}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePrefectureSelect(item.prefecture)}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.prefecture}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {item.municipalities.length}件の自治体
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
      )}

      {step === 'municipality' && (
        <FlatList
          data={municipalitiesInPrefecture}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleMunicipalitySelect(item)}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
      )}

      {step === 'area' && (
        <>
          <FlatList
            data={areas}
            keyExtractor={(item) => item.areaId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: area }) => {
              const isSelected = area.areaId === selectedAreaId;
              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { borderColor: tokenColors.primary, backgroundColor: tokenColors.primary + '08' },
                  ]}
                  onPress={() => setSelectedAreaId(area.areaId)}
                >
                  <View style={styles.areaContent}>
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: colors.text },
                        isSelected && { color: tokenColors.primary },
                      ]}
                    >
                      {area.areaName}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                      {area.districts.join('、')}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={tokenColors.primary} />}
                </TouchableOpacity>
              );
            }}
          />

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: tokenColors.primary },
                !selectedAreaId && { opacity: 0.5 },
              ]}
              onPress={handleComplete}
              disabled={!selectedAreaId}
            >
              <Text style={styles.confirmText}>はじめる</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const { colors } = useTheme();
  const steps: Step[] = ['prefecture', 'municipality', 'area'];
  const currentIndex = steps.indexOf(current);

  return (
    <View style={stepStyles.container}>
      {steps.map((s, i) => (
        <View key={s} style={stepStyles.row}>
          <View
            style={[
              stepStyles.dot,
              {
                backgroundColor: i <= currentIndex ? tokenColors.primary : colors.border,
              },
            ]}
          />
          {i < steps.length - 1 && (
            <View
              style={[
                stepStyles.line,
                {
                  backgroundColor: i < currentIndex ? tokenColors.primary : colors.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 40,
    height: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  areaContent: {
    flex: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  cardSubtitle: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  confirmButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
