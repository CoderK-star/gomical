// Design tokens for the Gomical app
// Pastel color palette with rounded, friendly UI

export const colors = {
  primary: '#7C9EF5',
  primaryLight: '#A8BEF8',
  primaryDark: '#5A7EE0',

  // Garbage type colors (from nagareyama.json)
  burnable: '#FF8A80',
  plastic: '#FFD180',
  nonBurnable: '#82B1FF',
  petbottle: '#B9F6CA',
  hazardous: '#FF80AB',

  // Semantic
  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',

  // Light theme
  light: {
    background: '#F8F9FC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F2F8',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },

  // Dark theme
  dark: {
    background: '#0F1117',
    surface: '#1A1B23',
    surfaceSecondary: '#252631',
    text: '#E5E7EB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2D2E3A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  shadow: string;
}
