import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, SectionHeader } from '@/src/components/common';
import { GarbageBadge } from '@/src/components/garbage';
import { useCalendar } from '@/src/hooks/useCalendar';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { searchItems, getAllCategories, type SearchResult } from '@/src/services/searchService';

export default function SearchScreen() {
  const { colors } = useTheme();
  const { municipality, hasArea } = useCalendar();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchItems(query, municipality),
    [query, municipality]
  );

  const categories = useMemo(
    () => getAllCategories(municipality),
    [municipality]
  );

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
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="ごみの品名を入力..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {query.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.keyword}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Ionicons name="help-circle-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                「{query}」に一致する品目が見つかりません
              </Text>
              <Text style={[styles.noResultsHint, { color: colors.textTertiary }]}>
                自治体の公式情報をご確認ください
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SearchResultRow item={item} colors={colors} />
          )}
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.garbageType.typeId}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <SectionHeader title="分別カテゴリ" style={{ marginBottom: spacing.sm }} />
          }
          renderItem={({ item }) => (
            <View style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.categoryHeader}>
                <GarbageBadge garbageType={item.garbageType} size="sm" />
                <Text style={[styles.categoryTitle, { color: colors.text }]}>
                  {item.garbageType.name}
                </Text>
              </View>
              <Text style={[styles.categoryItems, { color: colors.textSecondary }]}>
                {item.items.join('、')}
              </Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const MATCH_LABELS: Record<string, string> = {
  local: '',
  exact: '',
  alias: '',
  description: '説明文から推定',
  fuzzy: '類似キーワード',
};

function SearchResultRow({ item, colors }: { item: SearchResult; colors: any }) {
  const matchLabel = MATCH_LABELS[item.matchType];

  return (
    <View style={[styles.resultRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.resultDot, { backgroundColor: item.garbageType.color }]} />
      <View style={styles.resultContent}>
        <Text style={[styles.resultKeyword, { color: colors.text }]}>{item.keyword}</Text>
        <Text style={[styles.resultType, { color: item.garbageType.color }]}>
          {item.garbageType.name}
        </Text>
        {matchLabel ? (
          <Text style={[styles.matchHint, { color: colors.textTertiary }]}>
            {matchLabel}
          </Text>
        ) : null}
        {item.notes && (
          <Text style={[styles.resultNotes, { color: colors.textTertiary }]}>
            {item.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultKeyword: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  resultType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  matchHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
    fontStyle: 'italic',
  },
  resultNotes: {
    fontSize: fontSize.xs,
    marginTop: 4,
    fontStyle: 'italic',
  },
  categoryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  categoryItems: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  noResultsText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  noResultsHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
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
