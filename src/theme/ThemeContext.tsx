import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { colors, type ThemeColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: colors.light,
  setMode: () => {},
});

export function ThemeProvider({
  children,
  initialMode = 'system',
  onModeChange,
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
}) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const themeColors = isDark ? colors.dark : colors.light;

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    onModeChange?.(newMode);
  };

  useEffect(() => {
    setModeState(initialMode);
  }, [initialMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors: themeColors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
