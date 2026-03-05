import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

// TODO: スクリーンコンテナのバリエーシンを追加する
interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  style,
  padded = true,
}: ScreenContainerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        padded && { paddingHorizontal: spacing.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
