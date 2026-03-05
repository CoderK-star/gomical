import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WasteRecord, WastePreferences, RecordingUnit, BagSize } from '../types/waste';

const RECORDS_KEY = 'gomical_waste_records';
const PREFS_KEY = 'gomical_waste_prefs';

const defaultPrefs: WastePreferences = {
  defaultUnit: 'bags',
  defaultBagSize: 'medium',
};

interface PersistedWasteData {
  schemaVersion: number;
  records: WasteRecord[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface WasteStore {
  records: WasteRecord[];
  prefs: WastePreferences;
  isLoaded: boolean;

  load: () => Promise<void>;
  addRecord: (record: Omit<WasteRecord, 'id' | 'createdAt'>) => Promise<WasteRecord>;
  deleteRecord: (id: string) => Promise<void>;
  updatePrefs: (partial: Partial<WastePreferences>) => Promise<void>;
}

export const useWasteStore = create<WasteStore>((set, get) => ({
  records: [],
  prefs: defaultPrefs,
  isLoaded: false,

  load: async () => {
    try {
      const [rawRecords, rawPrefs] = await Promise.all([
        AsyncStorage.getItem(RECORDS_KEY),
        AsyncStorage.getItem(PREFS_KEY),
      ]);

      let records: WasteRecord[] = [];
      if (rawRecords) {
        const parsed = JSON.parse(rawRecords) as PersistedWasteData;
        if (parsed.schemaVersion === 1 && Array.isArray(parsed.records)) {
          records = parsed.records;
        }
      }

      let prefs = defaultPrefs;
      if (rawPrefs) {
        prefs = { ...defaultPrefs, ...JSON.parse(rawPrefs) };
      }

      set({ records, prefs, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addRecord: async (input) => {
    const record: WasteRecord = {
      ...input,
      id: generateId(),
      createdAt: Date.now(),
    };
    const next = [...get().records, record];
    set({ records: next });
    try {
      const data: PersistedWasteData = { schemaVersion: 1, records: next };
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(data));
    } catch {
      // silently fail
    }
    return record;
  },

  deleteRecord: async (id) => {
    const next = get().records.filter((r) => r.id !== id);
    set({ records: next });
    try {
      const data: PersistedWasteData = { schemaVersion: 1, records: next };
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(data));
    } catch {
      // silently fail
    }
  },

  updatePrefs: async (partial) => {
    const next = { ...get().prefs, ...partial };
    set({ prefs: next });
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // silently fail
    }
  },
}));
