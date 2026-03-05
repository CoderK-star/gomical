import type { WasteRecord, PeriodAggregation, TypeAggregation, BagSize } from '../types/waste';

const emptyBagsBySize = (): Record<BagSize, number> => ({
  large: 0,
  medium: 0,
  small: 0,
});

function emptyTypeAgg(garbageTypeId: string): TypeAggregation {
  return {
    garbageTypeId,
    totalBags: 0,
    bagsBySize: emptyBagsBySize(),
    totalKg: 0,
    recordCount: 0,
  };
}

/** Filter records by YYYY-MM period key */
function filterByMonth(records: WasteRecord[], year: number, month: number): WasteRecord[] {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return records.filter((r) => r.date.startsWith(key));
}

/** Aggregate records into per-type and total stats */
function aggregate(records: WasteRecord[], periodKey: string): PeriodAggregation {
  const typeMap = new Map<string, TypeAggregation>();

  for (const r of records) {
    let agg = typeMap.get(r.garbageTypeId);
    if (!agg) {
      agg = emptyTypeAgg(r.garbageTypeId);
      typeMap.set(r.garbageTypeId, agg);
    }
    agg.recordCount += 1;
    if (r.unit === 'bags') {
      agg.totalBags += r.amount;
      if (r.bagSize) {
        agg.bagsBySize[r.bagSize] += r.amount;
      }
    } else {
      agg.totalKg += r.amount;
    }
  }

  const byType = Array.from(typeMap.values());
  return {
    periodKey,
    byType,
    totalBags: byType.reduce((sum, t) => sum + t.totalBags, 0),
    totalKg: byType.reduce((sum, t) => sum + t.totalKg, 0),
    recordCount: records.length,
  };
}

/** Get aggregated stats for a specific month */
export function getMonthlyAggregation(
  records: WasteRecord[],
  year: number,
  month: number,
): PeriodAggregation {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return aggregate(filterByMonth(records, year, month), key);
}

/** Get monthly trend data for the past N months */
export function getMonthlyTrend(
  records: WasteRecord[],
  months: number,
  fromYear: number,
  fromMonth: number,
): PeriodAggregation[] {
  const result: PeriodAggregation[] = [];
  let y = fromYear;
  let m = fromMonth;

  for (let i = 0; i < months; i++) {
    // Go back i months from the starting point
    let targetMonth = m - i;
    let targetYear = y;
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    result.unshift(getMonthlyAggregation(records, targetYear, targetMonth));
  }

  return result;
}

/** Compare current month to previous month, returning deltas */
export function getMonthComparison(
  records: WasteRecord[],
  year: number,
  month: number,
): { bagsDelta: number; kgDelta: number } {
  const current = getMonthlyAggregation(records, year, month);

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prev = getMonthlyAggregation(records, prevYear, prevMonth);

  return {
    bagsDelta: current.totalBags - prev.totalBags,
    kgDelta: Math.round((current.totalKg - prev.totalKg) * 10) / 10,
  };
}

/** Filter records for a specific municipality */
export function filterByMunicipality(
  records: WasteRecord[],
  municipalityId: string,
): WasteRecord[] {
  return records.filter((r) => r.municipalityId === municipalityId);
}
