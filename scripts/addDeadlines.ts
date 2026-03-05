/**
 * addDeadlines.ts — 収集時間締切をgarbageTypesに一括注入するスクリプト
 *
 * 各自治体のごみ収集は多くの場合「朝8:00まで」「朝8:30まで」に出すルールが
 * あるが、5374.jp CSVにはこの情報が含まれていない。
 *
 * 解決策:
 *   1. 自治体公式サイトから調査済みの締切時間をルックアップテーブルで管理
 *   2. ごみ種別ごとに異なる締切がある場合は個別指定
 *   3. 情報が見つからない自治体にはデフォルト値（朝8:00）を適用
 *      ※ 日本の多くの自治体は朝8:00〜8:30を指定しているため合理的なデフォルト
 *
 * Usage:
 *   npx tsx scripts/addDeadlines.ts                # プレビュー（変更なし）
 *   npx tsx scripts/addDeadlines.ts --apply         # JSONファイルに書き込み
 *   npx tsx scripts/addDeadlines.ts --id kanazawa   # 特定自治体のみ
 *   npx tsx scripts/addDeadlines.ts --default "朝8:30"  # デフォルト値を変更
 *   npx tsx scripts/addDeadlines.ts --no-default    # デフォルト適用なし（既知のみ）
 *   npx tsx scripts/addDeadlines.ts --overwrite     # 既存deadline値を上書き
 */

import * as fs from 'fs';
import * as path from 'path';

// ====================================================================
// Types (script-local — JSON構造に合わせたもの)
// ====================================================================

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

interface Municipality {
  municipalityId: string;
  municipalityName: string;
  prefecture: string;
  lastUpdated: string;
  fiscalYear: number;
  collectionDeadline?: string;
  garbageTypes: GarbageType[];
  areas: any[];
  specialRules: any;
  overrides: any[];
}

// ====================================================================
// 自治体別 収集締切テーブル
//
// 調査方法:
//   各自治体の公式ホームページ・ごみ分別ガイド等を参照。
//   記載のある自治体は実際の時間を使用。
//   記載のない自治体は DEFAULT_DEADLINE が適用される。
//
// 形式:
//   municipalityId → {
//     default: "時間" ← 全タイプ共通の締切
//     types?: { typeId: "時間" } ← タイプ別に異なる場合
//   }
//
// 出典メモ（参考）:
//   札幌市: 朝8:30まで（市公式ごみ分けガイド）
//   金沢市: 朝8:00まで（家庭ごみの出し方）
//   世田谷区: 朝8:00まで（区公式サイト）
//   板橋区: 朝8:00まで（板橋区ごみと資源の分け方・出し方）
//   江戸川区: 朝8:00まで（区公式リサイクルガイド）
//   柏市: 朝8:00まで（家庭ごみの出し方)
//   横須賀市: 朝8:00まで（ごみ・リサイクルカレンダー）
//   浜松市: 朝8:30まで（ごみの分け方・出し方ガイドブック）
//   富山市: 朝8:00まで（ごみ出しルール）
//   佐賀市: 朝8:30まで（ごみの出し方ガイドブック）
//   豊見城市: 朝8:30まで（ごみ収集カレンダー）
//   流山市: 朝8:30まで（既存データより）
//   立川市: 朝8:00まで（ごみ分別ハンドブック）
//   室蘭市: 朝8:00まで（家庭ごみの分け方・出し方）
//   茨城町: 朝8:00まで（ごみカレンダー）
//   三郷市: 朝8:30まで（ごみの出し方ガイド）
//   富士吉田市: 朝8:00まで（ごみの分け方・出し方）
//   丹波篠山市: 朝8:00まで（ごみ出しカレンダー）
//   伊賀市: 朝8:00まで（ごみの正しい出し方）
// ====================================================================

interface DeadlineConfig {
  default: string;
  types?: Record<string, string>;
}

const KNOWN_DEADLINES: Record<string, DeadlineConfig> = {
  // 北海道
  'sapporo':       { default: '朝8:30' },
  'muroran':       { default: '朝8:00' },

  // 関東
  'ibaraki-town':  { default: '朝8:00' },
  'misato':        { default: '朝8:30' },
  'kashiwa':       { default: '朝8:00' },
  'setagaya':      { default: '朝8:00' },
  'itabashi':      { default: '朝8:00' },
  'edogawa':       { default: '朝8:00' },
  'tachikawa':     { default: '朝8:00' },
  'yokosuka':      { default: '朝8:00' },

  // 中部
  'toyama':        { default: '朝8:00' },
  'kanazawa':      { default: '朝8:00' },
  'fujiyoshida':   { default: '朝8:00' },
  'hamamatsu':     { default: '朝8:30' },

  // 近畿
  'sasayama':      { default: '朝8:00' },

  // 中国・四国
  'iga':           { default: '朝8:00' },

  // 九州・沖縄
  'saga':          { default: '朝8:30' },
  'tomigusuku':    { default: '朝8:30' },

  // 手動追加
  'nagareyama':    { default: '朝8:30' },
};

// ====================================================================
// CLI Parsing
// ====================================================================

const args = process.argv.slice(2);

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getFlagValue(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const applyMode = hasFlag('apply');
const dryRun = !applyMode;
const targetId = getFlagValue('id');
const customDefault = getFlagValue('default');
const noDefault = hasFlag('no-default');
const overwrite = hasFlag('overwrite');

const DEFAULT_DEADLINE = customDefault ?? '朝8:00';

// ====================================================================
// Main
// ====================================================================

const DATA_DIR = path.resolve(__dirname, '..', 'src', 'data');

function getJsonFiles(): string[] {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && f !== 'holidays.json')
    .filter(f => !f.startsWith('search'))
    .sort();
}

function processFile(filePath: string): { changed: boolean; municipalityName: string; details: string[] } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: Municipality = JSON.parse(raw);
  const id = data.municipalityId;
  const details: string[] = [];
  let changed = false;

  // 適用する締切情報を決定
  const knownConfig = KNOWN_DEADLINES[id];

  for (const gt of data.garbageTypes) {
    // 既存の deadline がある場合、--overwrite でなければスキップ
    if (gt.deadline && !overwrite) {
      details.push(`  [skip] ${gt.name}: 既存 "${gt.deadline}"`);
      continue;
    }

    let deadline: string | undefined;

    // 1. タイプ別の固有時間
    if (knownConfig?.types?.[gt.typeId]) {
      deadline = knownConfig.types[gt.typeId];
    }
    // 2. 自治体の既知デフォルト
    else if (knownConfig?.default) {
      deadline = knownConfig.default;
    }
    // 3. 自治体トップレベルの collectionDeadline
    else if (data.collectionDeadline) {
      deadline = data.collectionDeadline;
    }
    // 4. グローバルデフォルト
    else if (!noDefault) {
      deadline = DEFAULT_DEADLINE;
    }

    if (deadline) {
      const prev = gt.deadline;
      gt.deadline = deadline;
      const action = prev ? `上書き "${prev}" → "${deadline}"` : `追加 "${deadline}"`;
      details.push(`  [set]  ${gt.name}: ${action}`);
      changed = true;
    } else {
      details.push(`  [none] ${gt.name}: 情報なし（スキップ）`);
    }
  }

  // 自治体レベルの collectionDeadline も同期（ない場合は追加）
  if (knownConfig && !data.collectionDeadline) {
    data.collectionDeadline = knownConfig.default;
    details.push(`  [set]  collectionDeadline: "${knownConfig.default}"`);
    changed = true;
  }

  if (changed && applyMode) {
    const output = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, output, 'utf-8');
  }

  return { changed, municipalityName: `${data.municipalityName} (${id})`, details };
}

// ---- Run ----

console.log('='.repeat(60));
console.log('addDeadlines — ごみ収集締切時間 注入スクリプト');
console.log('='.repeat(60));
console.log(`モード: ${applyMode ? '✏️  書き込み' : '👀 プレビュー（--apply で書き込み）'}`);
if (targetId) console.log(`対象: ${targetId}`);
if (noDefault) console.log('デフォルト: 無効（--no-default）');
else console.log(`デフォルト: ${DEFAULT_DEADLINE}`);
if (overwrite) console.log('上書き: 有効（--overwrite）');
console.log('='.repeat(60));
console.log();

const files = getJsonFiles();
let totalChanged = 0;
let totalTypes = 0;

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: Municipality = JSON.parse(raw);

  // --id フィルタ
  if (targetId && data.municipalityId !== targetId) continue;

  const result = processFile(filePath);
  totalTypes += data.garbageTypes.length;

  const marker = result.changed ? '✅' : '⏭️';
  console.log(`${marker} ${result.municipalityName}`);
  for (const d of result.details) {
    console.log(d);
  }
  if (result.changed) totalChanged++;
  console.log();
}

console.log('='.repeat(60));
console.log(`結果: ${totalChanged} 自治体を${applyMode ? '更新しました' : '更新予定'}`);
console.log(`対象ごみ種別: ${totalTypes} 件`);
if (dryRun && totalChanged > 0) {
  console.log('\n💡 変更を適用するには: npx tsx scripts/addDeadlines.ts --apply');
}
console.log('='.repeat(60));
