import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, SectionHeader } from '@/src/components/common';
import { GarbageBadge } from '@/src/components/garbage';
import { GarbageTypeCard } from '@/src/components/garbage';
import { useCalendar } from '@/src/hooks/useCalendar';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { formatDateJa, getMonthDays, formatDateISO, getOrdinalWeekOfMonth } from '@/src/utils/dateUtils';

type ViewMode = 'month' | 'week';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { hasArea, getMonthCalendar, getDateCollections } = useCalendar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(
    () => (hasArea ? getMonthCalendar(year, month) : []),
    [hasArea, year, month]
  );

  const selectedDayData = useMemo(
    () => (hasArea ? getDateCollections(selectedDate) : null),
    [hasArea, selectedDate]
  );

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Calendar grid: pad start with empty cells to align weekday columns
  const firstDayOfWeek = monthDays[0]?.getDay() ?? 0;
  const gridCells: (Date | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...monthDays,
  ];

  function navigateMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setCurrentDate(d);
  }

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  if (!hasArea) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            地区が未選択です
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {year}年{month + 1}月
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day of week headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map((name, i) => (
            <View key={name} style={styles.dayHeaderCell}>
              <Text
                style={[
                  styles.dayHeaderText,
                  { color: i === 0 ? '#EF5350' : i === 6 ? tokenColors.primary : colors.textSecondary },
                ]}
              >
                {name}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {gridCells.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateStr = formatDateISO(day);
            const dayData = calendarDays.find((cd) => cd.date === dateStr);
            const isSelected = selectedDate.toDateString() === day.toDateString();
            const isToday = new Date().toDateString() === day.toDateString();
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: tokenColors.primary + '20', borderRadius: borderRadius.sm },
                  isToday && !isSelected && { borderWidth: 1, borderColor: tokenColors.primary, borderRadius: borderRadius.sm },
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSunday ? '#EF5350' : isSaturday ? tokenColors.primary : colors.text },
                    isSelected && { color: tokenColors.primary, fontWeight: fontWeight.bold },
                    dayData?.isHoliday && { color: '#EF5350' },
                  ]}
                >
                  {day.getDate()}
                </Text>
                <View style={styles.dayDots}>
                  {dayData?.garbageTypes.slice(0, 3).map((gt) => (
                    <View key={gt.typeId} style={[styles.dot, { backgroundColor: gt.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Date Detail */}
        <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
          <SectionHeader
            title={formatDateJa(selectedDate)}
            subtitle={selectedDayData?.isHoliday ? selectedDayData.holidayName : undefined}
          />
          {selectedDayData && selectedDayData.garbageTypes.length > 0 ? (
            selectedDayData.garbageTypes.map((gt) => (
              <GarbageTypeCard key={gt.typeId} garbageType={gt} showRules />
            ))
          ) : (
            <View style={[styles.noCollection, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.noCollectionText, { color: colors.textSecondary }]}>
                {selectedDayData?.notes?.[0] ?? '収集日ではありません'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  dayHeaders: {
    flexDirection: 'row',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayNumber: {
    fontSize: fontSize.sm,
  },
  dayDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  detailSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noCollection: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  noCollectionText: {
    fontSize: fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
