import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, fontSize, fontWeight } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

// TODO: セクションヘッダーのバリエーシンを追加する
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  right?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, style, right }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
