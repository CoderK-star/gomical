import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, SectionHeader } from '@/src/components/common';
import { CategoryBar, MonthlyTrend, WasteSummaryCard, RecordListItem } from '@/src/components/waste';
import { useWasteRecords } from '@/src/hooks/useWasteRecords';
import { useCalendar } from '@/src/hooks/useCalendar';
import { getMonthlyAggregation, getMonthComparison, getMonthlyTrend, filterByMunicipality } from '@/src/services/wasteService';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { t } from '@/src/i18n';

export default function WasteStatsScreen() {
  const { colors } = useTheme();
  const { records, deleteRecord, municipalityId } = useWasteRecords();
  const { municipality } = useCalendar();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const filteredRecords = useMemo(
    () => (municipalityId ? filterByMunicipality(records, municipalityId) : records),
    [records, municipalityId],
  );

  const aggregation = useMemo(
    () => getMonthlyAggregation(filteredRecords, year, month),
    [filteredRecords, year, month],
  );

  const comparison = useMemo(
    () => getMonthComparison(filteredRecords, year, month),
    [filteredRecords, year, month],
  );

  const trend = useMemo(
    () => getMonthlyTrend(filteredRecords, 6, year, month),
    [filteredRecords, year, month],
  );

  // Records for the selected month, sorted newest first
  const monthRecords = useMemo(() => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return filteredRecords
      .filter((r) => r.date.startsWith(key))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredRecords, year, month]);

  // Max value for scaling bars
  const maxCategoryValue = useMemo(() => {
    return Math.max(
      ...aggregation.byType.map((ta) => Math.max(ta.totalBags, ta.totalKg)),
      1,
    );
  }, [aggregation]);

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {year}{t('waste.yearSuffix')}{month}{t('waste.monthSuffix')}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={8} disabled={isCurrentMonth}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isCurrentMonth ? colors.textTertiary : colors.text}
            />
          </TouchableOpacity>
        </View>

        {aggregation.recordCount === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('waste.noRecords')}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {t('waste.startTracking')}
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <WasteSummaryCard
              aggregation={aggregation}
              bagsDelta={comparison.bagsDelta}
              kgDelta={comparison.kgDelta}
            />

            {/* Category Breakdown */}
            <SectionHeader title={t('waste.monthlyBreakdown')} style={{ marginTop: spacing.xl }} />
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              {aggregation.byType.map((ta) => (
                <CategoryBar
                  key={ta.garbageTypeId}
                  aggregation={ta}
                  garbageType={municipality.garbageTypes.find(
                    (gt) => gt.typeId === ta.garbageTypeId,
                  )}
                  maxValue={maxCategoryValue}
                />
              ))}
            </View>

            {/* Monthly Trend */}
            <SectionHeader title={t('waste.monthlyTrend')} style={{ marginTop: spacing.xl }} />
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <MonthlyTrend trend={trend} />
            </View>
          </>
        )}

        {/* Record List */}
        {monthRecords.length > 0 && (
          <>
            <SectionHeader
              title={t('waste.recordList')}
              subtitle={`${monthRecords.length}${t('waste.recordCountSuffix')}`}
              style={{ marginTop: spacing.xl }}
            />
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              {monthRecords.map((record) => (
                <RecordListItem
                  key={record.id}
                  record={record}
                  garbageType={municipality.garbageTypes.find(
                    (gt) => gt.typeId === record.garbageTypeId,
                  )}
                  onDelete={deleteRecord}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingBottom: 40,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  monthLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptyHint: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
});
