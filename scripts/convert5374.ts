/**
 * 5374.jp Open Data → Gomical JSON Converter
 *
 * 5374.jp format expects CSV files in a directory:
 *   - target.csv:    garbage type definitions (name, furigana, styles, etc.)
 *   - area_days.csv: area name → collection days mapping
 *   - description.csv: (optional) disposal rules per garbage type
 *
 * Usage:
 *   npx ts-node scripts/convert5374.ts <input_dir> <municipality_id> <municipality_name> <prefecture>
 *
 * Example:
 *   npx ts-node scripts/convert5374.ts ./5374data/kanazawa kanazawa 金沢市 石川県
 */

import * as fs from 'fs';
import * as path from 'path';

interface Municipality {
  municipalityId: string;
  municipalityName: string;
  prefecture: string;
  lastUpdated: string;
  fiscalYear: number;
  garbageTypes: GarbageType[];
  areas: Area[];
  specialRules: SpecialRules;
  overrides: ScheduleOverride[];
}

interface GarbageType {
  typeId: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  description: string;
  rules: string[];
}

interface CollectionSchedule {
  pattern: 'weekday' | 'monthly' | 'custom';
  days: string[];
  ordinalWeeks: number[];
  day?: string;
  dates: string[];
}

interface Area {
  areaId: string;
  areaName: string;
  districts: string[];
  schedule: Record<string, CollectionSchedule>;
}

interface SpecialRules {
  holidayPolicy: 'skip' | 'collect';
  yearEndYearStart?: { noCollectionStart: string; noCollectionEnd: string };
  notes: string[];
}

interface ScheduleOverride {
  date: string;
  areaId: string;
  typeId: string;
  action: 'cancel' | 'add';
  reason?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  '燃': '#FF8A80',
  '不燃': '#82B1FF',
  'プラ': '#FFD180',
  'ペット': '#B9F6CA',
  '資源': '#E1BEE7',
  'びん': '#CE93D8',
  '缶': '#90CAF9',
  '紙': '#FFCC80',
  '有害': '#FF80AB',
  '粗大': '#BCAAA4',
  '段ボール': '#D7CCC8',
};

const WEEKDAY_MAP: Record<string, string> = {
  '月': 'monday',
  '火': 'tuesday',
  '水': 'wednesday',
  '木': 'thursday',
  '金': 'friday',
  '土': 'saturday',
  '日': 'sunday',
};

function parseCsv(content: string): string[][] {
  return content
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
}

function toTypeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s・、()（）]/g, '-')
    .replace(/[^a-z0-9\u3040-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `type-${Date.now()}`;
}

function guessColor(name: string): string {
  for (const [key, color] of Object.entries(DEFAULT_COLORS)) {
    if (name.includes(key)) return color;
  }
  const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 17) % 360;
  return `hsl(${hue}, 70%, 75%)`;
}

function parseScheduleString(schedStr: string): CollectionSchedule {
  const schedule: CollectionSchedule = {
    pattern: 'weekday',
    days: [],
    ordinalWeeks: [],
    dates: [],
  };

  if (!schedStr || schedStr === '×' || schedStr === '-') {
    return schedule;
  }

  // Pattern: "第1第3月" → monthly, [1,3], monday
  const ordinalMatch = schedStr.match(/(?:第(\d))+/g);
  const dayMatch = schedStr.match(/[月火水木金土日]/);

  if (ordinalMatch && dayMatch) {
    schedule.pattern = 'monthly';
    schedule.ordinalWeeks = ordinalMatch.map((m) => parseInt(m.replace('第', ''), 10));
    schedule.day = WEEKDAY_MAP[dayMatch[0]] || '';
    return schedule;
  }

  // Pattern: "月木" → weekday, [monday, thursday]
  const weekdays = schedStr.match(/[月火水木金土日]/g);
  if (weekdays) {
    schedule.pattern = 'weekday';
    schedule.days = weekdays.map((d) => WEEKDAY_MAP[d]).filter(Boolean);
    return schedule;
  }

  return schedule;
}

function convert(inputDir: string, municipalityId: string, municipalityName: string, prefecture: string): Municipality {
  const targetPath = path.join(inputDir, 'target.csv');
  const areaDaysPath = path.join(inputDir, 'area_days.csv');
  const descPath = path.join(inputDir, 'description.csv');

  if (!fs.existsSync(targetPath)) throw new Error(`target.csv not found in ${inputDir}`);
  if (!fs.existsSync(areaDaysPath)) throw new Error(`area_days.csv not found in ${inputDir}`);

  const targetRows = parseCsv(fs.readFileSync(targetPath, 'utf-8'));
  const areaDaysRows = parseCsv(fs.readFileSync(areaDaysPath, 'utf-8'));

  let descriptions: Record<string, string[]> = {};
  if (fs.existsSync(descPath)) {
    const descRows = parseCsv(fs.readFileSync(descPath, 'utf-8'));
    for (const row of descRows) {
      if (row.length >= 2) {
        descriptions[row[0]] = row.slice(1).filter(Boolean);
      }
    }
  }

  // Parse target.csv → garbage types
  // Format: name, furigana, style(color), ...
  const garbageTypes: GarbageType[] = targetRows
    .filter((row) => row[0] && row[0] !== 'type')
    .map((row) => {
      const name = row[0];
      const id = toTypeId(name);
      return {
        typeId: id,
        name,
        shortName: name.length > 4 ? name.slice(0, 4) : name,
        color: row[2] || guessColor(name),
        icon: id,
        description: descriptions[name]?.[0] || '',
        rules: descriptions[name]?.slice(1) || [],
      };
    });

  const typeNames = garbageTypes.map((t) => t.name);

  // Parse area_days.csv → areas
  // Header: area_name, type1, type2, type3, ...
  const header = areaDaysRows[0];
  const areas: Area[] = areaDaysRows.slice(1)
    .filter((row) => row[0])
    .map((row, idx) => {
      const areaName = row[0];
      const schedule: Record<string, CollectionSchedule> = {};

      for (let i = 1; i < header.length && i < row.length; i++) {
        const typeName = header[i];
        const gt = garbageTypes.find((t) => t.name === typeName);
        if (!gt) continue;
        schedule[gt.typeId] = parseScheduleString(row[i]);
      }

      return {
        areaId: String(idx + 1),
        areaName,
        districts: [areaName],
        schedule,
      };
    });

  return {
    municipalityId,
    municipalityName,
    prefecture,
    lastUpdated: new Date().toISOString().split('T')[0],
    fiscalYear: new Date().getFullYear(),
    garbageTypes,
    areas,
    specialRules: {
      holidayPolicy: 'skip',
      yearEndYearStart: {
        noCollectionStart: '12-29',
        noCollectionEnd: '01-03',
      },
      notes: [
        '年末年始（12/29〜1/3）は収集がありません',
        '収集日当日の朝8時30分までに集積所へ出してください',
      ],
    },
    overrides: [],
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: npx ts-node scripts/convert5374.ts <input_dir> <municipality_id> <name> <prefecture>');
  console.log('Example: npx ts-node scripts/convert5374.ts ./5374data/kanazawa kanazawa 金沢市 石川県');
  process.exit(1);
}

const [inputDir, id, name, pref] = args;
try {
  const result = convert(inputDir, id, name, pref);
  const outputPath = path.join(__dirname, '..', 'src', 'data', `${id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Converted: ${result.municipalityName} (${result.areas.length} areas, ${result.garbageTypes.length} types)`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nDon't forget to add the entry to src/data/registry.ts!`);
} catch (e: any) {
  console.error('Error:', e.message);
  process.exit(1);
}
