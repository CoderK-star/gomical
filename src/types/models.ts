// TypeScript type definitions for the Garbage Collection Calendar app
// Translated from backend/src/models.py (Pydantic models)

export type SchedulePattern = "weekday" | "monthly" | "custom";

export interface GarbageType {
  typeId: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  description?: string;
  deadline?: string;          // 収集時間締切 e.g. "朝8:00", "朝8:30"
  rules: string[];
}

export interface CollectionSchedule {
  pattern: SchedulePattern;
  days: string[];          // weekday pattern: ["monday", "thursday"]
  ordinalWeeks: number[];  // monthly pattern: [1, 3] = 1st & 3rd week
  day?: string;            // monthly pattern: "wednesday"
  dates: string[];         // custom pattern: ["2025-05-10"]
}

export interface Area {
  areaId: string;
  areaName: string;
  districts: string[];
  schedule: Record<string, CollectionSchedule>; // typeId -> schedule
}

export interface ScheduleOverride {
  date: string;            // "YYYY-MM-DD"
  areaId: string;
  typeId: string;
  action: "cancel" | "add";
  reason?: string;
}

export interface YearEndYearStart {
  noCollectionStart: string;  // "MM-DD"
  noCollectionEnd: string;    // "MM-DD"
}

export interface SpecialRules {
  holidayPolicy: "skip" | "collect";
  holidayAlternative?: string;
  yearEndYearStart?: YearEndYearStart;
  notes: string[];
}

export interface Municipality {
  municipalityId: string;
  municipalityName: string;
  prefecture: string;
  lastUpdated: string;
  fiscalYear: number;
  collectionDeadline?: string;
  garbageTypes: GarbageType[];
  areas: Area[];
  specialRules: SpecialRules;
  overrides: ScheduleOverride[];
}

export interface Holiday {
  date: string;  // "YYYY-MM-DD"
  name: string;
}

export interface CalendarDay {
  date: string;  // "YYYY-MM-DD"
  garbageTypes: GarbageType[];
  isHoliday: boolean;
  holidayName?: string;
  notes: string[];
}

export interface NextCollection {
  garbageType: GarbageType;
  date: string;  // "YYYY-MM-DD"
  daysUntil: number;
}

export interface AppSettings {
  selectedMunicipalityId: string | null;
  selectedAreaId: string | null;
  notificationEnabled: boolean;
  notificationTime: "evening" | "morning";
  notificationEveningHour: number;
  notificationMorningHour: number;
  theme: "light" | "dark" | "system";
  language: "ja" | "en" | "system";
  onboardingComplete: boolean;
}

export interface SearchableItem {
  keyword: string;
  aliases: string[];
  garbageTypeId: string;
  notes?: string;
}

export interface SearchIndex {
  municipalityId: string;
  items: SearchableItem[];
}
