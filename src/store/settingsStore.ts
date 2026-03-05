import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../types/models';

const STORAGE_KEY = 'gomical_settings';

const defaultSettings: AppSettings = {
  selectedMunicipalityId: null,
  selectedAreaId: null,
  notificationEnabled: false,
  notificationTime: 'evening',
  notificationEveningHour: 20,
  notificationMorningHour: 7,
  theme: 'system',
  language: 'system',
  onboardingComplete: false,
};

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppSettings>;
        set({ ...defaultSettings, ...saved, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  update: async (partial) => {
    const current = get();
    const next: AppSettings = {
      selectedMunicipalityId: partial.selectedMunicipalityId ?? current.selectedMunicipalityId,
      selectedAreaId: partial.selectedAreaId ?? current.selectedAreaId,
      notificationEnabled: partial.notificationEnabled ?? current.notificationEnabled,
      notificationTime: partial.notificationTime ?? current.notificationTime,
      notificationEveningHour: partial.notificationEveningHour ?? current.notificationEveningHour,
      notificationMorningHour: partial.notificationMorningHour ?? current.notificationMorningHour,
      theme: partial.theme ?? current.theme,
      language: partial.language ?? current.language,
      onboardingComplete: partial.onboardingComplete ?? current.onboardingComplete,
    };
    set(partial);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // silently fail
    }
  },

  reset: async () => {
    set({ ...defaultSettings, isLoaded: true });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently fail
    }
  },
}));
