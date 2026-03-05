import { format, isToday, isTomorrow, isYesterday, differenceInCalendarDays } from 'date-fns';

const WEEKDAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

const WEEKDAY_ENGLISH: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function getJapaneseDayName(date: Date): string {
  return WEEKDAY_NAMES_JA[date.getDay()];
}

export function englishWeekdayToIndex(day: string): number {
  return WEEKDAY_ENGLISH[day.toLowerCase()] ?? -1;
}

export function formatDateJa(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dow = getJapaneseDayName(date);
  return `${m}月${d}日（${dow}）`;
}

export function formatDateShort(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getRelativeDateLabel(date: Date): string | null {
  if (isToday(date)) return '今日';
  if (isTomorrow(date)) return '明日';
  if (isYesterday(date)) return '昨日';
  return null;
}

export function getDaysUntilLabel(daysUntil: number): string {
  if (daysUntil === 0) return '今日';
  if (daysUntil === 1) return '明日';
  return `あと${daysUntil}日`;
}

export function getOrdinalWeekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

export function daysUntil(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getWeekDays(baseDate: Date): Date[] {
  const days: Date[] = [];
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}
