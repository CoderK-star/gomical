/**
 * 5374.jp Bulk Data Fetcher & Converter
 *
 * Fetches garbage collection data from verified 5374.jp GitHub repositories
 * and converts them into the Gomical app's JSON format.
 *
 * 5374.jp CSV format:
 *   description.csv  → garbage type definitions (label, sublabel, description, styles, bgcolor)
 *   area_days.csv    → area schedules (地名, センター, type1, type2, ...)
 *   target.csv       → item-to-category search dictionary (label, name, notice, furigana)
 *
 * Usage:
 *   npx tsx scripts/fetch5374.ts                # fetch all verified repos
 *   npx tsx scripts/fetch5374.ts --list          # list repos without fetching
 *   npx tsx scripts/fetch5374.ts --id sapporo    # fetch single municipality
 *   npx tsx scripts/fetch5374.ts --dry-run       # parse without writing files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ====================================================================
// Types
// ====================================================================

interface RepoEntry {
  id: string;
  name: string;
  prefecture: string;
  repo: string;
  branch: string;
  dataPath: string;
}

interface ConvertedMunicipality {
  municipalityId: string;
  municipalityName: string;
  prefecture: string;
  lastUpdated: string;
  fiscalYear: number;
  garbageTypes: any[];
  areas: any[];
  specialRules: any;
  overrides: any[];
}

interface SearchItem {
  keyword: string;
  aliases: string[];
  garbageTypeId: string;
  notes?: string;
}

// ====================================================================
// Verified repository list (data confirmed to be unique / non-default)
// ====================================================================

const VERIFIED_REPOS: RepoEntry[] = [
  // ---- 北海道 ----
  { id: 'sapporo', name: '札幌市', prefecture: '北海道', repo: 'codeforsapporo/5374', branch: 'master', dataPath: 'data' },
  { id: 'muroran', name: '室蘭市', prefecture: '北海道', repo: 'muroran/5374', branch: 'master', dataPath: 'data' },

  // ---- 関東 ----
  { id: 'ibaraki-town', name: '茨城町', prefecture: '茨城県', repo: 'codeforibaraki/ibaraki-town-5374', branch: 'master', dataPath: 'data' },
  { id: 'misato', name: '三郷市', prefecture: '埼玉県', repo: '5374misato/5374', branch: 'master', dataPath: 'data' },
  { id: 'kashiwa', name: '柏市', prefecture: '千葉県', repo: 'katoharu432/5374', branch: 'kashiwa', dataPath: 'data' },
  { id: 'setagaya', name: '世田谷区', prefecture: '東京都', repo: 'codeforsetagaya/5374', branch: 'gh-pages', dataPath: 'data' },
  { id: 'itabashi', name: '板橋区', prefecture: '東京都', repo: 'codeforitabashi-org/5374', branch: 'master', dataPath: 'data' },
  { id: 'edogawa', name: '江戸川区', prefecture: '東京都', repo: 'telabo/5374', branch: 'gh-pages', dataPath: 'data' },
  { id: 'tachikawa', name: '立川市', prefecture: '東京都', repo: '5374tachikawa/5374', branch: 'master', dataPath: 'data' },
  { id: 'yokosuka', name: '横須賀市', prefecture: '神奈川県', repo: 'codeforyokosuka/5374', branch: 'master', dataPath: 'data' },

  // ---- 中部 ----
  { id: 'toyama', name: '富山市', prefecture: '富山県', repo: 'codefortoyama/5374', branch: 'gh-pages', dataPath: 'data' },
  { id: 'kanazawa', name: '金沢市', prefecture: '石川県', repo: 'codeforkanazawa-org/5374', branch: 'master', dataPath: 'data' },
  // echizen excluded: repo contains unmodified Kanazawa default data
  { id: 'fujiyoshida', name: '富士吉田市', prefecture: '山梨県', repo: '5374fujiyoshida/5374', branch: 'master', dataPath: 'data' },
  { id: 'hamamatsu', name: '浜松市', prefecture: '静岡県', repo: 'great-h/5374', branch: 'gh-pages', dataPath: 'data' },

  // ---- 近畿 ----
  { id: 'sasayama', name: '丹波篠山市', prefecture: '兵庫県', repo: 'codeforsasayamatamba/5374', branch: 'master', dataPath: 'data' },

  // ---- 中国・四国 ----
  { id: 'iga', name: '伊賀市', prefecture: '三重県', repo: '5374iga/5374iga.github.com', branch: 'master', dataPath: 'data' },

  // ---- 九州・沖縄 ----
  { id: 'saga', name: '佐賀市', prefecture: '佐賀県', repo: 'codeforsaga/5374', branch: 'gh-pages', dataPath: 'data' },
  { id: 'tomigusuku', name: '豊見城市', prefecture: '沖縄県', repo: 'skurima/skurima.github.io', branch: 'gh-pages', dataPath: 'data' },
];

// ====================================================================
// HTTP fetch with redirect
// ====================================================================

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const doRequest = (targetUrl: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(targetUrl, { headers: { 'User-Agent': 'Gomical-Converter/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) return doRequest(loc, redirects + 1);
          return reject(new Error(`Redirect without location`));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

function rawUrl(repo: string, branch: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
}

// ====================================================================
// CSV Parsing (handles BOM, quoted fields, mixed line endings)
// ====================================================================

function parseCsv(content: string): string[][] {
  const clean = content.replace(/^\uFEFF/, '');
  return clean
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    );
}

// ====================================================================
// Schedule String Parsing
// ====================================================================

const WEEKDAY_MAP: Record<string, string> = {
  '月': 'monday', '火': 'tuesday', '水': 'wednesday',
  '木': 'thursday', '金': 'friday', '土': 'saturday', '日': 'sunday',
};

function parseScheduleString(s: string): any {
  const result: any = { pattern: 'weekday', days: [], ordinalWeeks: [], dates: [] };
  if (!s || s === '×' || s === '-' || s.trim() === '') return result;

  const str = s.trim();

  // Tokenize space-separated entries like "火1 火3" or "月 木"
  const tokens = str.split(/\s+/);
  const ordinals: number[] = [];
  const weekdays: string[] = [];
  let ordinalDay: string | null = null;

  for (const token of tokens) {
    // Pattern: "火1" or "火3" = Nth weekday of month
    const ordMatch = token.match(/^([月火水木金土日])(\d)$/);
    if (ordMatch) {
      const day = WEEKDAY_MAP[ordMatch[1]];
      if (day) {
        ordinals.push(parseInt(ordMatch[2], 10));
        ordinalDay = day;
      }
      continue;
    }

    // Pattern: "第1第3月" or "第2水"
    const japOrdMatch = token.match(/((?:第\d)+)([月火水木金土日])/);
    if (japOrdMatch) {
      const nums = japOrdMatch[1].match(/\d/g);
      const day = WEEKDAY_MAP[japOrdMatch[2]];
      if (nums && day) {
        ordinals.push(...nums.map(Number));
        ordinalDay = day;
      }
      continue;
    }

    // Simple weekday names: "月" "木"
    const dayChars = token.match(/[月火水木金土日]/g);
    if (dayChars) {
      weekdays.push(...dayChars.map((d) => WEEKDAY_MAP[d]).filter(Boolean));
    }
  }

  if (ordinals.length > 0 && ordinalDay) {
    result.pattern = 'monthly';
    result.ordinalWeeks = ordinals;
    result.day = ordinalDay;
    return result;
  }

  if (weekdays.length > 0) {
    result.pattern = 'weekday';
    result.days = weekdays;
    return result;
  }

  return result;
}

// ====================================================================
// Color Guessing
// ====================================================================

const COLOR_HINTS: Record<string, string> = {
  '燃': '#FF8A80', '可燃': '#FF8A80', '不燃': '#82B1FF', '燃えない': '#82B1FF',
  'プラ': '#FFD180', 'ペット': '#B9F6CA', '資源': '#E1BEE7',
  'びん': '#CE93D8', '瓶': '#CE93D8', '缶': '#90CAF9', '紙': '#FFCC80',
  '有害': '#FF80AB', '危険': '#FF80AB', '粗大': '#BCAAA4',
  '段ボール': '#D7CCC8', '金属': '#B0BEC5', 'ガラス': '#B3E5FC',
  '布': '#F8BBD0', '古紙': '#FFE0B2', '容器': '#FFD180',
  '生ごみ': '#A5D6A7', 'リサイクル': '#B9F6CA',
};

// Garbage type names often contain hints about their color (e.g. "燃えるゴミ" → red, "プラスチック" → light orange).
function guessColor(name: string): string {
  for (const [key, color] of Object.entries(COLOR_HINTS)) {
    if (name.includes(key)) return color;
  }
  const h = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 17) % 360;
  return `hsl(${h}, 65%, 72%)`;
}

function toTypeId(name: string): string {
  return name.toLowerCase()
    .replace(/[\s・、()（）《》〈〉「」]/g, '-')
    .replace(/[^a-z0-9\u3040-\u9fff\u30A0-\u30FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `type-${Date.now()}`;
}

// ====================================================================
// Main Conversion Logic
// ====================================================================

function convertData(
  descCsv: string | null,
  areaDaysCsv: string,
  targetCsv: string | null,
  entry: RepoEntry,
): { municipality: ConvertedMunicipality; searchItems: SearchItem[] } {
  // --- 1. Parse garbage types from description.csv ---
  // description.csv: label, sublabel, description, styles(icon), bgcolor
  // If no description.csv, infer types from area_days.csv header

  const areaDaysRows = parseCsv(areaDaysCsv);
  const header = areaDaysRows[0];

  // Determine where the type columns start (skip 地名 and センター columns)
  let typeStartIdx = 1;
  for (let i = 0; i < Math.min(header.length, 3); i++) {
    const h = header[i].replace(/（.*）/g, '').trim();
    if (h.includes('センター') || h.includes('center') || h === 'マスター') {
      typeStartIdx = i + 1;
    }
  }
  if (header[0].includes('地名') || header[0].includes('地区') || header[0].includes('校下') || header[0].includes('地域')) {
    typeStartIdx = Math.max(typeStartIdx, 1);
  }
  // If column 1 is "センター", types start at 2
  if (header.length > 1 && (header[1].includes('センター') || header[1] === 'マスター' || header[1].includes('center'))) {
    typeStartIdx = Math.max(typeStartIdx, 2);
  }
  // Handle the saga format with extra "マスター" column
  if (header[0] === 'マスター') {
    typeStartIdx = 3; // skip マスター, 地名, センター
  }

  const typeNamesFromHeader = header.slice(typeStartIdx).filter(Boolean);

  let garbageTypes: any[] = [];
  const typeColorMap: Record<string, string> = {};

  if (descCsv) {
    const descRows = parseCsv(descCsv);
    // Skip header if present
    const startRow = descRows[0][0] === 'label' ? 1 : 0;
    for (let i = startRow; i < descRows.length; i++) {
      const row = descRows[i];
      if (!row[0]) continue;
      const label = row[0];
      const bgcolor = row[4] || '';
      if (bgcolor && bgcolor.startsWith('#')) {
        typeColorMap[label] = bgcolor;
      }
    }
  }

  garbageTypes = typeNamesFromHeader.map((name) => {
    const cleanName = name.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim();
    const id = toTypeId(cleanName);
    return {
      typeId: id,
      name: cleanName,
      shortName: cleanName.length > 5 ? cleanName.slice(0, 15) : cleanName, // 5文字以上は15文字まで表示
      color: typeColorMap[name] || typeColorMap[cleanName] || guessColor(cleanName),
      icon: id,
      description: '',
      rules: [],
    };
  });

  // --- 2. Parse areas from area_days.csv ---
  const areas = areaDaysRows.slice(1)
    .filter((row) => row[0] && row[0].trim() !== '')
    .map((row, idx) => {
      const areaName = row[0].trim();
      const schedule: Record<string, any> = {};

      for (let i = typeStartIdx; i < header.length && i < row.length; i++) {
        const typeIdx = i - typeStartIdx;
        if (typeIdx >= garbageTypes.length) break;
        const gt = garbageTypes[typeIdx];
        schedule[gt.typeId] = parseScheduleString(row[i]);
      }

      return {
        areaId: String(idx + 1),
        areaName,
        districts: [areaName],
        schedule,
      };
    });

  // --- 3. Parse search items from target.csv ---
  // target.csv: label(category), name(item), notice, furigana
  const searchItems: SearchItem[] = [];
  if (targetCsv) {
    const targetRows = parseCsv(targetCsv);
    const startRow = targetRows[0]?.[0] === 'label' ? 1 : 0;
    for (let i = startRow; i < targetRows.length; i++) {
      const row = targetRows[i];
      if (!row[0] || !row[1]) continue;
      const categoryName = row[0].trim();
      const itemName = row[1].trim();
      const notice = row[2]?.trim() || undefined;
      const furigana = row[3]?.trim() || undefined;

      const gt = garbageTypes.find(
        (t) => t.name === categoryName || categoryName.includes(t.name) || t.name.includes(categoryName)
      );
      if (!gt) continue;

      const aliases: string[] = [];
      if (furigana && furigana !== itemName) aliases.push(furigana);

      searchItems.push({
        keyword: itemName,
        aliases,
        garbageTypeId: gt.typeId,
        notes: notice || undefined,
      });
    }
  }

  const municipality: ConvertedMunicipality = {
    municipalityId: entry.id,
    municipalityName: entry.name,
    prefecture: entry.prefecture,
    lastUpdated: new Date().toISOString().split('T')[0],
    fiscalYear: new Date().getFullYear(),
    garbageTypes,
    areas,
    specialRules: {
      holidayPolicy: 'skip',
      yearEndYearStart: { noCollectionStart: '12-29', noCollectionEnd: '01-03' },
      notes: [
        '年末年始は収集がありません',
        '収集日当日の朝までに指定場所へ出してください',
      ],
    },
    overrides: [],
  };

  return { municipality, searchItems };
}

// ====================================================================
// Fetch & Convert Pipeline
// ====================================================================

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data');
const SEARCH_DIR = path.join(__dirname, '..', 'src', 'data', 'search');
const CACHE_DIR = path.join(__dirname, '..', '.5374-cache');

async function fetchAndConvert(entry: RepoEntry, dryRun: boolean): Promise<{
  success: boolean;
  types: number;
  areas: number;
  items: number;
  error?: string;
}> {
  const prefix = `${entry.id} (${entry.name})`;
  try {
    const descUrl = rawUrl(entry.repo, entry.branch, `${entry.dataPath}/description.csv`);
    const areaUrl = rawUrl(entry.repo, entry.branch, `${entry.dataPath}/area_days.csv`);
    const targetUrl = rawUrl(entry.repo, entry.branch, `${entry.dataPath}/target.csv`);

    const [areaDaysCsv] = await Promise.all([fetchUrl(areaUrl)]);

    let descCsv: string | null = null;
    try { descCsv = await fetchUrl(descUrl); } catch {}

    let targetCsv: string | null = null;
    try { targetCsv = await fetchUrl(targetUrl); } catch {}

    const { municipality, searchItems } = convertData(descCsv, areaDaysCsv, targetCsv, entry);

    if (municipality.garbageTypes.length === 0 || municipality.areas.length === 0) {
      return { success: false, types: 0, areas: 0, items: 0, error: 'Empty data' };
    }

    if (!dryRun) {
      // Cache raw CSVs
      const cacheDir = path.join(CACHE_DIR, entry.id);
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'area_days.csv'), areaDaysCsv, 'utf-8');
      if (descCsv) fs.writeFileSync(path.join(cacheDir, 'description.csv'), descCsv, 'utf-8');
      if (targetCsv) fs.writeFileSync(path.join(cacheDir, 'target.csv'), targetCsv, 'utf-8');

      // Write municipality JSON
      const outPath = path.join(OUTPUT_DIR, `${entry.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(municipality, null, 2), 'utf-8');

      // Write per-municipality search index
      if (searchItems.length > 0) {
        fs.mkdirSync(SEARCH_DIR, { recursive: true });
        const searchPath = path.join(SEARCH_DIR, `${entry.id}.json`);
        fs.writeFileSync(searchPath, JSON.stringify(searchItems, null, 2), 'utf-8');
      }
    }

    console.log(`  ✓ ${prefix}: ${municipality.garbageTypes.length} types, ${municipality.areas.length} areas, ${searchItems.length} search items`);
    return { success: true, types: municipality.garbageTypes.length, areas: municipality.areas.length, items: searchItems.length };
  } catch (e: any) {
    console.log(`  ✗ ${prefix}: ${e.message}`);
    return { success: false, types: 0, areas: 0, items: 0, error: e.message };
  }
}

// ====================================================================
// Registry Auto-generation
// ====================================================================

function generateRegistry() {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const jsonFiles = fs.readdirSync(dataDir)
    .filter((f) => f.endsWith('.json') && f !== 'holidays.json');

  const entries: Array<{ id: string; file: string }> = [];
  for (const file of jsonFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
      if (content.municipalityId && content.municipalityName && content.prefecture) {
        entries.push({ id: content.municipalityId, file: file.replace('.json', '') });
      }
    } catch {}
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));

  const loaderLines = entries
    .map((e) => `  '${e.id}': () => require('./${e.file}.json') as Municipality,`)
    .join('\n');

  const code = `import type { Municipality } from '../types/models';

export interface MunicipalityEntry {
  id: string;
  name: string;
  prefecture: string;
}

export interface PrefectureGroup {
  prefecture: string;
  municipalities: MunicipalityEntry[];
}

const dataModules: Record<string, () => Municipality> = {
${loaderLines}
};

export function getMunicipalityList(): MunicipalityEntry[] {
  return Object.keys(dataModules).map((key) => {
    const m = dataModules[key]();
    return { id: m.municipalityId, name: m.municipalityName, prefecture: m.prefecture };
  });
}

export function getMunicipalityGroupedByPrefecture(): PrefectureGroup[] {
  const list = getMunicipalityList();
  const grouped = new Map<string, MunicipalityEntry[]>();

  for (const entry of list) {
    const existing = grouped.get(entry.prefecture) ?? [];
    existing.push(entry);
    grouped.set(entry.prefecture, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'ja'))
    .map(([prefecture, municipalities]) => ({
      prefecture,
      municipalities: municipalities.sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    }));
}

export function loadMunicipalityById(id: string): Municipality | null {
  const loader = dataModules[id];
  if (!loader) return null;
  return loader();
}

export function getMunicipalityIds(): string[] {
  return Object.keys(dataModules);
}
`;

  fs.writeFileSync(path.join(dataDir, 'registry.ts'), code, 'utf-8');
  console.log(`Registry updated: ${entries.length} municipalities`);
}

// ====================================================================
// CLI
// ====================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (args.includes('--list')) {
    console.log('\n=== Verified 5374.jp Repositories ===\n');
    const grouped = new Map<string, RepoEntry[]>();
    for (const r of VERIFIED_REPOS) {
      const list = grouped.get(r.prefecture) ?? [];
      list.push(r);
      grouped.set(r.prefecture, list);
    }
    for (const [pref, entries] of grouped) {
      console.log(`${pref}:`);
      for (const e of entries) {
        console.log(`  ${e.id.padEnd(18)} ${e.name.padEnd(10)} github.com/${e.repo}`);
      }
    }
    console.log(`\nTotal: ${VERIFIED_REPOS.length} verified repositories`);
    return;
  }

  const idIdx = args.indexOf('--id');
  const idFilter = idIdx >= 0 ? args[idIdx + 1] : null;
  const targets = idFilter
    ? VERIFIED_REPOS.filter((r) => r.id === idFilter)
    : VERIFIED_REPOS;

  if (targets.length === 0) {
    console.error(`No repository found for id "${idFilter}"`);
    process.exit(1);
  }

  if (!dryRun) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  console.log(`\n=== Fetching ${targets.length} municipalities from 5374.jp ===`);
  if (dryRun) console.log('(dry run - no files will be written)');
  console.log();

  let success = 0;
  let totalTypes = 0;
  let totalAreas = 0;
  let totalItems = 0;
  const errors: Array<{ id: string; error: string }> = [];

  const BATCH_SIZE = 4;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((e) => fetchAndConvert(e, dryRun)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.success) {
        success++;
        totalTypes += r.types;
        totalAreas += r.areas;
        totalItems += r.items;
      } else {
        errors.push({ id: batch[j].id, error: r.error || 'unknown' });
      }
    }

    if (i + BATCH_SIZE < targets.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${success}/${targets.length}`);
  console.log(`Total: ${totalTypes} garbage types, ${totalAreas} areas, ${totalItems} search items`);

  if (errors.length > 0) {
    console.log(`\nFailed:`);
    for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
  }

  if (!dryRun) {
    console.log('\nGenerating registry...');
    generateRegistry();
  }

  console.log('Done!');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
