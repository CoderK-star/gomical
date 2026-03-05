import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useWasteStore } from '@/src/store/wasteStore';
import { useNotifications } from '@/src/hooks/useNotifications';
import { initLocale, t } from '@/src/i18n';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { isLoaded, onboardingComplete } = useSettingsStore();

  // Initialize notification scheduling
  useNotifications();

  useEffect(() => {
    if (!isLoaded) return;
    const inOnboarding = segments[0] === 'onboarding';

    if (!onboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingComplete && inOnboarding) {
      router.replace('/');
    }
  }, [isLoaded, onboardingComplete, segments]);

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="record-waste"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="waste-stats"
          options={{
            title: t('waste.statsTitle'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  const { isLoaded: settingsLoaded, load: loadSettings, theme, language } = useSettingsStore();
  const loadWaste = useWasteStore((s) => s.load);

  useEffect(() => {
    loadSettings();
    loadWaste();
  }, []);

  useEffect(() => {
    if (settingsLoaded) {
      initLocale(language);
    }
  }, [settingsLoaded, language]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && settingsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, settingsLoaded]);

  if (!loaded || !settingsLoaded) {
    return null;
  }

  return (
    <ThemeProvider initialMode={theme}>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
