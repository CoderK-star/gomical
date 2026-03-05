import { useMemo } from 'react';
import type { Municipality, Area, CalendarDay, NextCollection } from '../types/models';
import {
  loadMunicipalityData,
  loadHolidays,
  findAreaById,
  getCalendarDay,
  getCalendarDaysForMonth,
  getNextCollections,
} from '../services/calendarEngine';
import { useSettingsStore } from '../store/settingsStore';

export function useCalendar() {
  const selectedMunicipalityId = useSettingsStore((s) => s.selectedMunicipalityId);
  const selectedAreaId = useSettingsStore((s) => s.selectedAreaId);

  const municipality = useMemo(
    () => loadMunicipalityData(selectedMunicipalityId ?? undefined),
    [selectedMunicipalityId]
  );

  const holidays = useMemo(() => loadHolidays(), []);

  const area = useMemo(
    () => (selectedAreaId ? findAreaById(municipality, selectedAreaId) : undefined),
    [selectedAreaId, municipality]
  );

  function getTodayCollections(): CalendarDay | null {
    if (!area) return null;
    return getCalendarDay(
      new Date(),
      area,
      municipality.garbageTypes,
      holidays,
      municipality.specialRules,
      municipality.overrides
    );
  }

  function getMonthCalendar(year: number, month: number): CalendarDay[] {
    if (!area) return [];
    return getCalendarDaysForMonth(
      year,
      month,
      area,
      municipality.garbageTypes,
      holidays,
      municipality.specialRules,
      municipality.overrides
    );
  }

  function getDateCollections(date: Date): CalendarDay | null {
    if (!area) return null;
    return getCalendarDay(
      date,
      area,
      municipality.garbageTypes,
      holidays,
      municipality.specialRules,
      municipality.overrides
    );
  }

  function getUpcomingCollections(): NextCollection[] {
    if (!area) return [];
    return getNextCollections(
      new Date(),
      area,
      municipality.garbageTypes,
      holidays,
      municipality.specialRules,
      municipality.overrides
    );
  }

  return {
    municipality,
    area,
    holidays,
    hasArea: !!area,
    getTodayCollections,
    getMonthCalendar,
    getDateCollections,
    getUpcomingCollections,
  };
}
