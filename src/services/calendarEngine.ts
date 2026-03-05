import type {
  Area,
  GarbageType,
  CollectionSchedule,
  SpecialRules,
  ScheduleOverride,
  Holiday,
  CalendarDay,
  NextCollection,
  Municipality,
} from '../types/models';
import {
  englishWeekdayToIndex,
  formatDateISO,
  getOrdinalWeekOfMonth,
  parseDate,
  daysUntil,
} from '../utils/dateUtils';

function isInYearEndPeriod(date: Date, rules: SpecialRules): boolean {
  const yne = rules.yearEndYearStart;
  if (!yne) return false;

  const [startMonth, startDay] = yne.noCollectionStart.split('-').map(Number);
  const [endMonth, endDay] = yne.noCollectionEnd.split('-').map(Number);

  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Year-end: 12-29 ~ 12-31
  if (month === 12 && startMonth === 12 && day >= startDay) return true;
  // Year-start: 01-01 ~ 01-03
  if (month === 1 && endMonth === 1 && day <= endDay) return true;

  return false;
}

function isHoliday(dateStr: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.date === dateStr);
}

function matchesSchedule(date: Date, schedule: CollectionSchedule): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

  switch (schedule.pattern) {
    case 'weekday': {
      return schedule.days.some(
        (d) => englishWeekdayToIndex(d) === dayOfWeek
      );
    }
    case 'monthly': {
      const targetDay = schedule.day;
      if (!targetDay) return false;
      if (englishWeekdayToIndex(targetDay) !== dayOfWeek) return false;
      const ordinal = getOrdinalWeekOfMonth(date);
      return schedule.ordinalWeeks.includes(ordinal);
    }
    case 'custom': {
      const dateStr = formatDateISO(date);
      return schedule.dates.includes(dateStr);
    }
    default:
      return false;
  }
}

export function getCollectionsForDate(
  date: Date,
  area: Area,
  garbageTypes: GarbageType[],
  holidays: Holiday[],
  specialRules: SpecialRules,
  overrides: ScheduleOverride[]
): GarbageType[] {
  const dateStr = formatDateISO(date);

  // 1. Year-end/year-start check
  if (isInYearEndPeriod(date, specialRules)) return [];

  // 2. Holiday check
  const holiday = isHoliday(dateStr, holidays);
  if (holiday && specialRules.holidayPolicy === 'skip') return [];

  // 3. Override check - find cancellations and additions for this date+area
  const cancelledTypes = new Set<string>();
  const addedTypes = new Set<string>();
  for (const o of overrides) {
    if (o.date === dateStr && o.areaId === area.areaId) {
      if (o.action === 'cancel') cancelledTypes.add(o.typeId);
      if (o.action === 'add') addedTypes.add(o.typeId);
    }
  }

  // 4. Match each garbage type against its schedule
  const matched: GarbageType[] = [];
  const typeMap = new Map(garbageTypes.map((t) => [t.typeId, t]));

  for (const [typeId, schedule] of Object.entries(area.schedule)) {
    if (cancelledTypes.has(typeId)) continue;
    if (matchesSchedule(date, schedule)) {
      const gt = typeMap.get(typeId);
      if (gt) matched.push(gt);
    }
  }

  // 5. Add override additions
  for (const typeId of addedTypes) {
    const gt = typeMap.get(typeId);
    if (gt && !matched.some((m) => m.typeId === typeId)) {
      matched.push(gt);
    }
  }

  return matched;
}

export function getCalendarDay(
  date: Date,
  area: Area,
  garbageTypes: GarbageType[],
  holidays: Holiday[],
  specialRules: SpecialRules,
  overrides: ScheduleOverride[]
): CalendarDay {
  const dateStr = formatDateISO(date);
  const holiday = isHoliday(dateStr, holidays);
  const collections = getCollectionsForDate(
    date,
    area,
    garbageTypes,
    holidays,
    specialRules,
    overrides
  );

  const notes: string[] = [];
  if (isInYearEndPeriod(date, specialRules)) {
    notes.push('年末年始のため収集はありません');
  } else if (holiday && specialRules.holidayPolicy === 'skip') {
    notes.push(`${holiday.name}のため収集はありません`);
  }

  return {
    date: dateStr,
    garbageTypes: collections,
    isHoliday: !!holiday,
    holidayName: holiday?.name,
    notes,
  };
}

export function getCalendarDaysForMonth(
  year: number,
  month: number, // 0-indexed
  area: Area,
  garbageTypes: GarbageType[],
  holidays: Holiday[],
  specialRules: SpecialRules,
  overrides: ScheduleOverride[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(
      getCalendarDay(date, area, garbageTypes, holidays, specialRules, overrides)
    );
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getNextCollections(
  fromDate: Date,
  area: Area,
  garbageTypes: GarbageType[],
  holidays: Holiday[],
  specialRules: SpecialRules,
  overrides: ScheduleOverride[],
  maxDaysAhead: number = 60
): NextCollection[] {
  const results: Map<string, NextCollection> = new Map();

  const date = new Date(fromDate);
  for (let i = 0; i < maxDaysAhead; i++) {
    const collections = getCollectionsForDate(
      date,
      area,
      garbageTypes,
      holidays,
      specialRules,
      overrides
    );
    for (const gt of collections) {
      if (!results.has(gt.typeId)) {
        results.set(gt.typeId, {
          garbageType: gt,
          date: formatDateISO(date),
          daysUntil: daysUntil(fromDate, date),
        });
      }
    }
    // If found all types, stop early
    if (results.size === garbageTypes.length) break;
    date.setDate(date.getDate() + 1);
  }

  return Array.from(results.values()).sort((a, b) => a.daysUntil - b.daysUntil);
}

export function loadMunicipalityData(municipalityId?: string): Municipality {
  if (municipalityId) {
    const { loadMunicipalityById } = require('../data/registry');
    const data = loadMunicipalityById(municipalityId);
    if (data) return data;
  }
  return require('../data/nagareyama.json') as Municipality;
}

export function loadHolidays(): Holiday[] {
  return require('../data/holidays.json') as Holiday[];
}

export function findAreaByDistrict(
  municipality: Municipality,
  district: string
): Area | undefined {
  return municipality.areas.find((area) =>
    area.districts.some((d) => district.includes(d) || d.includes(district))
  );
}

export function findAreaById(
  municipality: Municipality,
  areaId: string
): Area | undefined {
  return municipality.areas.find((area) => area.areaId === areaId);
}
