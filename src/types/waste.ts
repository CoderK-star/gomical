// Type definitions for garbage output tracking feature

export type BagSize = 'large' | 'medium' | 'small';
export type RecordingUnit = 'bags' | 'kg';

/** A single waste output record */
export interface WasteRecord {
  id: string;
  date: string;              // "YYYY-MM-DD"
  municipalityId: string;
  garbageTypeId: string;     // links to GarbageType.typeId
  unit: RecordingUnit;
  amount: number;
  bagSize?: BagSize;         // required when unit === 'bags'
  note?: string;
  createdAt: number;         // Date.now()
}

/** User preferences for waste tracking */
export interface WastePreferences {
  defaultUnit: RecordingUnit;
  defaultBagSize: BagSize;
}

/** Aggregated stats for a single garbage type */
export interface TypeAggregation {
  garbageTypeId: string;
  totalBags: number;
  bagsBySize: Record<BagSize, number>;
  totalKg: number;
  recordCount: number;
}

/** Aggregated stats for a time period */
export interface PeriodAggregation {
  periodKey: string;          // "2025-01" for monthly
  byType: TypeAggregation[];
  totalBags: number;
  totalKg: number;
  recordCount: number;
}
