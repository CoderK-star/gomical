import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, SectionHeader } from '@/src/components/common';
import { GarbageBadge, NextCollectionCard } from '@/src/components/garbage';
import { RecordingCard } from '@/src/components/waste';
import { MascotCharacter, useMascotState } from '@/src/components/mascot';
import { useCalendar } from '@/src/hooks/useCalendar';
import { useWasteRecords } from '@/src/hooks/useWasteRecords';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { formatDateJa, getDaysUntilLabel, parseDate, getWeekDays, formatDateISO } from '@/src/utils/dateUtils';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { hasArea, area, municipality, getTodayCollections, getUpcomingCollections, getDateCollections } = useCalendar();
  const { monthlyAggregation } = useWasteRecords();
  const collectionDeadline = municipality.collectionDeadline;

  const today = new Date();
  const todayData = getTodayCollections();
  const mascot = useMascotState(todayData, hasArea);

  if (!hasArea) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <MascotCharacter mood={mascot.mood} message={mascot.message} size={120} />
          <Text style={[styles.emptyTitle, { color: colors.text, marginTop: spacing.xl }]}>
            地区が未選択です。
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            設定タブから地区を選択してください
          </Text>
        </View>
      </ScreenContainer>
    );
  }
  const upcoming = getUpcomingCollections();
  const weekDays = getWeekDays(today);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Mascot */}
        <View style={styles.mascotSection}>
          <MascotCharacter mood={mascot.mood} message={mascot.message} size={360} />
        </View>

        {/* Today's Header */}
        <View style={styles.todayHeader}>
          <Text style={[styles.todayDate, { color: colors.text }]}>
            {formatDateJa(today)}
          </Text>
          <Text style={[styles.areaLabel, { color: colors.textSecondary }]}>
            {area?.areaName}
          </Text>
        </View>

        {/* Today's Collections */}
        <SectionHeader title="今日のごみ" />
        {todayData && todayData.garbageTypes.length > 0 ? (
          <View style={styles.badgeRow}>
            {todayData.garbageTypes.map((gt) => (
              <GarbageBadge key={gt.typeId} garbageType={gt} size="lg" />
            ))}
          </View>
        ) : (
          <View style={[styles.noCollectionCard, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.noCollectionText, { color: colors.textSecondary }]}>
              {todayData?.notes?.[0] ?? '今日は収集日ではありません'}
            </Text>
          </View>
        )}

        {/* Waste Recording Card */}
        <RecordingCard
          todayTypes={todayData?.garbageTypes ?? []}
          monthlyAggregation={monthlyAggregation}
          garbageTypes={municipality.garbageTypes}
          onRecord={() => router.push('/record-waste')}
          onViewStats={() => router.push('/waste-stats')}
        />

        {/* 7-Day Strip */}
        <SectionHeader title="今週の予定" style={{ marginTop: spacing.xl }} />
        <View style={styles.weekStrip}>
          {weekDays.map((day) => {
            const dayData = getDateCollections(day);
            const isToday = day.toDateString() === today.toDateString();
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            return (
              <View
                key={formatDateISO(day)}
                style={[
                  styles.weekDay,
                  { backgroundColor: isToday ? tokenColors.primary + '15' : colors.surfaceSecondary },
                  isToday && { borderColor: tokenColors.primary, borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.weekDayName, { color: isToday ? tokenColors.primary : colors.textSecondary }]}>
                  {dayNames[day.getDay()]}
                </Text>
                <Text style={[styles.weekDayNum, { color: isToday ? tokenColors.primary : colors.text }]}>
                  {day.getDate()}
                </Text>
                <View style={styles.weekDayDots}>
                  {dayData?.garbageTypes.slice(0, 3).map((gt) => (
                    <View key={gt.typeId} style={[styles.dot, { backgroundColor: gt.color }]} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Next Collections */}
        <SectionHeader title="次回の収集日" style={{ marginTop: spacing.xl }} />
        {upcoming.map((nc) => (
          <NextCollectionCard
            key={nc.garbageType.typeId}
            garbageType={nc.garbageType}
            dateLabel={formatDateJa(parseDate(nc.date))}
            daysUntilLabel={getDaysUntilLabel(nc.daysUntil)}
            deadline={nc.garbageType.deadline ?? collectionDeadline}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingTop: spacing.lg,
  },
  mascotSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  todayHeader: {
    marginBottom: spacing.lg,
  },
  todayDate: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  areaLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noCollectionCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  noCollectionText: {
    fontSize: fontSize.md,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  weekDayName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  weekDayNum: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  weekDayDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: spacing.xs,
    height: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
});
