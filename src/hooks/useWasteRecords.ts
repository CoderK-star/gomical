import { useMemo } from 'react';
import { useWasteStore } from '../store/wasteStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  getMonthlyAggregation,
  getMonthComparison,
  filterByMunicipality,
} from '../services/wasteService';
import type { PeriodAggregation } from '../types/waste';

export function useWasteRecords() {
  const { records, prefs, isLoaded, addRecord, deleteRecord, updatePrefs } = useWasteStore();
  const municipalityId = useSettingsStore((s) => s.selectedMunicipalityId);

  const municipalityRecords = useMemo(
    () => (municipalityId ? filterByMunicipality(records, municipalityId) : records),
    [records, municipalityId],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthlyAggregation: PeriodAggregation = useMemo(
    () => getMonthlyAggregation(municipalityRecords, currentYear, currentMonth),
    [municipalityRecords, currentYear, currentMonth],
  );

  const monthComparison = useMemo(
    () => getMonthComparison(municipalityRecords, currentYear, currentMonth),
    [municipalityRecords, currentYear, currentMonth],
  );

  return {
    records: municipalityRecords,
    allRecords: records,
    prefs,
    isLoaded,
    monthlyAggregation,
    monthComparison,
    addRecord,
    deleteRecord,
    updatePrefs,
    municipalityId,
  };
}
