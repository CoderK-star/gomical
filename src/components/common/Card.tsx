import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, shadow, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

// TODO: カードのバリエーションを追加する
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  const { colors } = useTheme();

  const variantStyle: ViewStyle =
    variant === 'elevated'
      ? { backgroundColor: colors.surface, ...shadow.md }
      : variant === 'outlined'
        ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
        : { backgroundColor: colors.surfaceSecondary };

  return (
    <View style={[styles.card, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
});
