/**
 * JSON→Markdown変換スクリプト
 * Difyナレッジベース用に、自治体データを人間が読みやすいMarkdownへ変換する。
 *
 * 使い方: npx tsx scripts/generateKnowledgeBase.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------- types (models.ts と同じ構造) ----------

interface CollectionSchedule {
  pattern: 'weekday' | 'monthly' | 'custom';
  days: string[];
  ordinalWeeks: number[];
  day?: string;
  dates: string[];
}

interface GarbageType {
  typeId: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  description?: string;
  deadline?: string;
  rules: string[];
}

interface Area {
  areaId: string;
  areaName: string;
  districts: string[];
  schedule: Record<string, CollectionSchedule>;
}

interface SpecialRules {
  holidayPolicy: 'skip' | 'collect';
  holidayAlternative?: string;
  yearEndYearStart?: { noCollectionStart: string; noCollectionEnd: string };
  notes: string[];
}

interface Municipality {
  municipalityId: string;
  municipalityName: string;
  prefecture: string;
  lastUpdated: string;
  fiscalYear: number;
  collectionDeadline?: string;
  garbageTypes: GarbageType[];
  areas: Area[];
  specialRules: SpecialRules;
  overrides: unknown[];
}

interface SearchEntry {
  keyword: string;
  aliases: string[];
  garbageTypeId: string;
  notes?: string;
}

// ---------- helpers ----------

const DAY_MAP: Record<string, string> = {
  monday: '月曜日',
  tuesday: '火曜日',
  wednesday: '水曜日',
  thursday: '木曜日',
  friday: '金曜日',
  saturday: '土曜日',
  sunday: '日曜日',
};

const ORDINAL_MAP: Record<number, string> = {
  1: '第1',
  2: '第2',
  3: '第3',
  4: '第4',
  5: '第5',
};

function formatSchedule(schedule: CollectionSchedule): string {
  switch (schedule.pattern) {
    case 'weekday':
      return `毎週 ${schedule.days.map((d) => DAY_MAP[d] || d).join('・')}`;
    case 'monthly': {
      const weeks = schedule.ordinalWeeks.map((w) => ORDINAL_MAP[w] || `第${w}`).join('・');
      const day = DAY_MAP[schedule.day || ''] || schedule.day || '';
      return `${weeks} ${day}`;
    }
    case 'custom':
      if (schedule.dates.length <= 5) {
        return schedule.dates.join(', ');
      }
      return `${schedule.dates.slice(0, 3).join(', ')} 他${schedule.dates.length - 3}日`;
    default:
      return '不明';
  }
}

function findGarbageTypeName(typeId: string, types: GarbageType[]): string {
  const found = types.find((t) => t.typeId === typeId);
  return found ? found.name : typeId;
}

// ---------- Markdown生成 ----------

function generateMunicipalityMarkdown(m: Municipality): string {
  const lines: string[] = [];

  lines.push(`# ${m.municipalityName}（${m.prefecture}）のごみ分別ガイド`);
  lines.push('');
  lines.push(`- 最終更新: ${m.lastUpdated}`);
  lines.push(`- 年度: ${m.fiscalYear}`);
  if (m.collectionDeadline) {
    lines.push(`- 既定の収集締切: ${m.collectionDeadline}`);
  }
  lines.push('');

  // ごみの種類
  lines.push('## ごみの種類');
  lines.push('');
  for (const gt of m.garbageTypes) {
    lines.push(`### ${gt.name}`);
    if (gt.description) {
      lines.push(`- 説明: ${gt.description}`);
    }
    if (gt.deadline) {
      lines.push(`- 収集締切: ${gt.deadline}`);
    }
    if (gt.rules.length > 0) {
      lines.push('- ルール:');
      for (const rule of gt.rules) {
        lines.push(`  - ${rule}`);
      }
    }
    lines.push('');
  }

  // 地区別収集スケジュール
  lines.push('## 地区別収集スケジュール');
  lines.push('');
  for (const area of m.areas) {
    const districtStr = area.districts.length <= 10
      ? area.districts.join('、')
      : `${area.districts.slice(0, 8).join('、')} 他${area.districts.length - 8}地域`;
    lines.push(`### ${area.areaName}（${districtStr}）`);
    for (const [typeId, schedule] of Object.entries(area.schedule)) {
      const typeName = findGarbageTypeName(typeId, m.garbageTypes);
      lines.push(`- ${typeName}: ${formatSchedule(schedule)}`);
    }
    lines.push('');
  }

  // 特別ルール
  lines.push('## 特別ルール');
  lines.push('');
  lines.push(`- 祝日の扱い: ${m.specialRules.holidayPolicy === 'skip' ? '収集なし' : '通常通り収集'}`);
  if (m.specialRules.holidayAlternative) {
    lines.push(`- 祝日の代替: ${m.specialRules.holidayAlternative}`);
  }
  if (m.specialRules.yearEndYearStart) {
    const ye = m.specialRules.yearEndYearStart;
    lines.push(`- 年末年始休止: ${ye.noCollectionStart} 〜 ${ye.noCollectionEnd}`);
  }
  for (const note of m.specialRules.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  return lines.join('\n');
}

function generateSearchMarkdown(
  municipalityName: string,
  items: SearchEntry[],
): string {
  const lines: string[] = [];

  lines.push(`# ${municipalityName} ごみ分別辞典`);
  lines.push('');
  lines.push('| 品名 | 分別 | 備考 |');
  lines.push('|------|------|------|');

  for (const item of items) {
    const notes = item.notes ? item.notes.replace(/\|/g, '／') : '';
    const keyword = item.keyword.replace(/\|/g, '／');
    const typeId = item.garbageTypeId.replace(/\|/g, '／');
    lines.push(`| ${keyword} | ${typeId} | ${notes} |`);
  }

  lines.push('');
  return lines.join('\n');
}

// ---------- main ----------

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const dataDir = path.join(projectRoot, 'src', 'data');
  const searchDir = path.join(dataDir, 'search');
  const outDir = path.join(projectRoot, 'knowledge-base');

  // 出力ディレクトリ作成
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 自治体JSONファイルを検索
  const jsonFiles = fs.readdirSync(dataDir).filter(
    (f) => f.endsWith('.json') && f !== 'holidays.json',
  );

  let totalFiles = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(dataDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const municipality: Municipality = JSON.parse(raw);
    const id = municipality.municipalityId;

    // 自治体ガイドMarkdown
    const guideContent = generateMunicipalityMarkdown(municipality);
    const guideFile = path.join(outDir, `${id}-guide.md`);
    fs.writeFileSync(guideFile, guideContent, 'utf-8');
    console.log(`✓ ${guideFile}`);
    totalFiles++;

    // 検索データMarkdown（存在する場合）
    const searchFile = path.join(searchDir, `${id}.json`);
    if (fs.existsSync(searchFile)) {
      const searchRaw = fs.readFileSync(searchFile, 'utf-8');
      const searchItems: SearchEntry[] = JSON.parse(searchRaw);
      if (searchItems.length > 0) {
        const dictContent = generateSearchMarkdown(municipality.municipalityName, searchItems);
        const dictFile = path.join(outDir, `${id}-dictionary.md`);
        fs.writeFileSync(dictFile, dictContent, 'utf-8');
        console.log(`✓ ${dictFile}`);
        totalFiles++;
      }
    }
  }

  console.log(`\n完了: ${totalFiles} ファイルを ${outDir} に出力しました`);
}

main();
