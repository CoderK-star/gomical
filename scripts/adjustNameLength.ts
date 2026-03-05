/**
 * fetch5374.ts　ごみ種別の name / shortName 文字数調整スクリプト
 *
 * 自治体JSONファイル内の garbageTypes を走査し、
 * name および shortName の文字数を指定の上限に合わせて調整します。
 * 日本語の区切り文字（・、）を考慮して自然な位置で切り詰めます。
 *
 * Usage:
 *   npx tsx scripts/adjustNameLength.ts                          # 現状を表示（dry-run）
 *   npx tsx scripts/adjustNameLength.ts --fix                    # デフォルト設定で修正
 *   npx tsx scripts/adjustNameLength.ts --name-max 10            # name の上限を10文字に
 *   npx tsx scripts/adjustNameLength.ts --short-max 6            # shortName の上限を6文字に
 *   npx tsx scripts/adjustNameLength.ts --name-max 8 --fix       # name を8文字以内に修正
 *   npx tsx scripts/adjustNameLength.ts --id sapporo             # 特定の自治体のみ
 *   npx tsx scripts/adjustNameLength.ts --id sapporo --fix       # 特定の自治体のみ修正
 *   npx tsx scripts/adjustNameLength.ts --name-max 0             # name の制限を無効化
 *   npx tsx scripts/adjustNameLength.ts --short-max 0            # shortName の制限を無効化
 */

import * as fs from 'fs';
import * as path from 'path';

// ====================================================================
// 設定
// ====================================================================

const DEFAULT_NAME_MAX = 15;      // name のデフォルト上限文字数
const DEFAULT_SHORT_MAX = 8;      // shortName のデフォルト上限文字数

// ====================================================================
// 既知のごみ収集用語辞書（省略形マッピング）
// ====================================================================

/** name が長すぎる場合の省略マッピング（完全形 → 省略形） */
const NAME_ABBREVIATIONS: Record<string, string> = {
  '容器包装プラスチック類': '容器包装プラ類',
  '容器包装プラスチック': '容器包装プラ',
  'プラスチック製容器包装': 'プラ製容器包装',
  'プラスチック・製容器包装': 'プラ・容器包装',
  '空き缶・空きびん・ペットボトル': '缶・びん・ペットボトル',
  'びん・缶・ペットボトル': 'びん・缶・ペット',
  '缶・びん・ペットボトル': '缶・びん・ペット',
  '紙パック・蛍光灯・電池類': '紙パック・蛍光灯等',
  '紙製容器包装・古紙': '紙容器・古紙',
};

/** shortName 用の省略マッピング（完全形 → 短縮形） */
const SHORT_ABBREVIATIONS: Record<string, string> = {
  '燃やせるごみ・スプレー缶': '燃やせるごみ',
  '燃やせるごみ（有料)': '燃やせる(有)',
  '燃やせるごみ（無料)': '燃やせる(無)',
  '燃やせるごみ': '燃やせる',
  '燃やせないごみ': '燃やせない',
  '燃やさないごみ': '燃やさない',
  '燃やさないゴミ': '燃やさない',
  '燃えないごみ': '燃えない',
  '燃えるごみ': '燃える',
  '燃やすごみ': '燃やす',
  'もやせない・危険': 'もやせない',
  '容器包装プラスチック類': '容器プラ類',
  '容器包装プラスチック': '容器プラ',
  'プラスチック製容器包装': 'プラ容器包装',
  'プラスチック・製容器包装': 'プラ・容器',
  'プラスチック類': 'プラ類',
  'プラスチック': 'プラ',
  'ペットボトル': 'ペットボトル',
  '空き缶・空きびん・ペットボトル': '缶・びん・ペット',
  'びん・缶・ペットボトル': 'びん・缶・ペット',
  '缶・びん・ペットボトル': '缶・びん・ペット',
  'ビン・カン・不燃物': 'びん・缶・不燃',
  'ガラス・陶磁器類': 'ガラス・陶磁器',
  'ガラス・陶器類': 'ガラス・陶器',
  '硬プラ・革製品類': '硬プラ・革',
  '紙パック・蛍光灯・電池類': '紙パック等',
  '紙製容器包装・古紙': '紙容器・古紙',
  'ビールびん・酒びん': 'ビール・酒びん',
  '新聞・折込チラシ': '新聞・チラシ',
  '段ボール・茶色紙': '段ボール等',
  '雑誌・本・雑がみ': '雑誌・雑がみ',
  '雑誌・雑がみ': '雑誌・雑がみ',
  '牛乳等紙パック': '紙パック',
  '有害危険ごみ': '有害危険',
  '資源ごみ': '資源',
  'カン・金属類': 'カン・金属',
  'その他のビン': 'その他ビン',
};

// ====================================================================
// 文字数調整ロジック
// ====================================================================

/** 日本語の区切り文字位置で自然に切り詰める */
function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;

  // 区切り文字の位置を検索（・、 を優先）
  const separators = ['・', '、', '/', '-', '(', '（'];

  // maxLen以内で最も後ろにある区切り文字の直前で切る
  let bestCut = -1;
  for (const sep of separators) {
    // maxLen以内の区切り文字位置を探す
    let idx = text.lastIndexOf(sep, maxLen - 1);
    if (idx > 0 && idx > bestCut) {
      bestCut = idx;
    }
  }

  // 区切り位置が見つかり、十分な長さがあれば区切り位置で切る
  if (bestCut > maxLen * 0.4) {
    return text.slice(0, bestCut);
  }

  // 区切り位置が見つからなければ単純に切る
  return text.slice(0, maxLen);
}

/** name を指定文字数以内に調整 */
function adjustName(name: string, maxLen: number): string {
  if (maxLen <= 0) return name; // 制限無効
  if (name.length <= maxLen) return name;

  // まず省略マッピングを確認
  const abbr = NAME_ABBREVIATIONS[name];
  if (abbr && abbr.length <= maxLen) return abbr;

  // マッピングにない場合はスマート切り詰め
  return smartTruncate(name, maxLen);
}

/** shortName を指定文字数以内に調整 */
function adjustShortName(shortName: string, name: string, maxLen: number): string {
  if (maxLen <= 0) return shortName; // 制限無効
  if (shortName.length <= maxLen) return shortName;

  // まず name に対する省略マッピングを確認
  const abbrFromName = SHORT_ABBREVIATIONS[name];
  if (abbrFromName && abbrFromName.length <= maxLen) return abbrFromName;

  // shortName に対する省略マッピングを確認
  const abbrFromShort = SHORT_ABBREVIATIONS[shortName];
  if (abbrFromShort && abbrFromShort.length <= maxLen) return abbrFromShort;

  // マッピングにない場合はスマート切り詰め
  return smartTruncate(name, maxLen);
}

// ====================================================================
// Types
// ====================================================================

interface Change {
  municipality: string;
  municipalityName: string;
  typeId: string;
  field: string;
  before: string;
  after: string;
}

// ====================================================================
// ファイル処理
// ====================================================================

function processFile(
  filePath: string,
  nameMax: number,
  shortMax: number,
  applyFix: boolean,
): Change[] {
  const changes: Change[] = [];
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!content.municipalityId || !content.garbageTypes) return [];

  const munId = content.municipalityId;
  const munName = content.municipalityName || munId;
  let modified = false;

  for (const gt of content.garbageTypes) {
    const origName: string = gt.name || '';
    const origShort: string = gt.shortName || '';

    // name の調整
    if (nameMax > 0 && origName.length > nameMax) {
      const newName = adjustName(origName, nameMax);
      if (newName !== origName) {
        changes.push({
          municipality: munId,
          municipalityName: munName,
          typeId: gt.typeId,
          field: 'name',
          before: origName,
          after: newName,
        });
        if (applyFix) {
          gt.name = newName;
          modified = true;
        }
      }
    }

    // shortName の調整
    if (shortMax > 0 && origShort.length > shortMax) {
      const newShort = adjustShortName(origShort, origName, shortMax);
      if (newShort !== origShort) {
        changes.push({
          municipality: munId,
          municipalityName: munName,
          typeId: gt.typeId,
          field: 'shortName',
          before: origShort,
          after: newShort,
        });
        if (applyFix) {
          gt.shortName = newShort;
          modified = true;
        }
      }
    }

    // shortName が name より長い場合の警告
    if (gt.shortName && gt.name && gt.shortName.length > gt.name.length) {
      // shortName を name と同じにする
      const newShort = gt.name.length <= (shortMax > 0 ? shortMax : Infinity)
        ? gt.name
        : adjustShortName(gt.name, gt.name, shortMax);
      if (newShort !== gt.shortName) {
        changes.push({
          municipality: munId,
          municipalityName: munName,
          typeId: gt.typeId,
          field: 'shortName',
          before: gt.shortName,
          after: newShort,
        });
        if (applyFix) {
          gt.shortName = newShort;
          modified = true;
        }
      }
    }
  }

  if (applyFix && modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
  }

  return changes;
}

// ====================================================================
// 統計表示
// ====================================================================

function showStats(filePaths: string[]) {
  console.log('\n=== 現在の文字数分布 ===\n');

  const nameLens: number[] = [];
  const shortLens: number[] = [];

  for (const fp of filePaths) {
    const content = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    if (!content.garbageTypes) continue;
    for (const gt of content.garbageTypes) {
      if (gt.name) nameLens.push(gt.name.length);
      if (gt.shortName) shortLens.push(gt.shortName.length);
    }
  }

  const histogram = (lens: number[], label: string) => {
    const counts = new Map<number, number>();
    for (const l of lens) counts.set(l, (counts.get(l) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    console.log(`  ${label} (全${lens.length}件):`);
    for (const [len, count] of sorted) {
      const bar = '█'.repeat(Math.min(count, 40));
      console.log(`    ${String(len).padStart(2)}文字: ${bar} ${count}`);
    }
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const max = Math.max(...lens);
    const min = Math.min(...lens);
    console.log(`    最小: ${min}  最大: ${max}  平均: ${avg.toFixed(1)}`);
    console.log();
  };

  histogram(nameLens, 'name');
  histogram(shortLens, 'shortName');
}

// ====================================================================
// メイン
// ====================================================================

function main() {
  const args = process.argv.slice(2);

  // ヘルプ
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ごみ種別の name / shortName 文字数調整スクリプト

Usage:
  npx tsx scripts/adjustNameLength.ts [options]

Options:
  --name-max <n>    name の上限文字数 (デフォルト: ${DEFAULT_NAME_MAX}, 0で無効)
  --short-max <n>   shortName の上限文字数 (デフォルト: ${DEFAULT_SHORT_MAX}, 0で無効)
  --fix             実際にファイルを書き換える (省略時はdry-run)
  --id <id>         特定の自治体のみ処理
  --stats           文字数分布の統計を表示
  --help, -h        このヘルプを表示
`);
    return;
  }

  // CLI引数パース
  const applyFix = args.includes('--fix');
  const showStatsFlag = args.includes('--stats');

  const nameMaxIdx = args.indexOf('--name-max');
  const nameMax = nameMaxIdx >= 0 ? parseInt(args[nameMaxIdx + 1], 10) : DEFAULT_NAME_MAX;

  const shortMaxIdx = args.indexOf('--short-max');
  const shortMax = shortMaxIdx >= 0 ? parseInt(args[shortMaxIdx + 1], 10) : DEFAULT_SHORT_MAX;

  const idIdx = args.indexOf('--id');
  const idFilter = idIdx >= 0 ? args[idIdx + 1] : null;

  // ファイル一覧
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  let jsonFiles = fs.readdirSync(dataDir)
    .filter((f) => f.endsWith('.json') && f !== 'holidays.json')
    .map((f) => path.join(dataDir, f));

  if (idFilter) {
    jsonFiles = jsonFiles.filter((f) => path.basename(f, '.json') === idFilter);
    if (jsonFiles.length === 0) {
      console.error(`自治体 "${idFilter}" のデータファイルが見つかりません`);
      process.exit(1);
    }
  }

  console.log(`\n=== name / shortName 文字数調整 ===\n`);
  console.log(`対象: ${jsonFiles.length} ファイル`);
  console.log(`name 上限: ${nameMax > 0 ? nameMax + '文字' : '制限なし'}`);
  console.log(`shortName 上限: ${shortMax > 0 ? shortMax + '文字' : '制限なし'}`);
  console.log(`モード: ${applyFix ? '修正適用' : 'dry-run (プレビュー)'}\n`);

  // 統計表示
  if (showStatsFlag) {
    showStats(jsonFiles);
  }

  // 変更検出・適用
  const allChanges: Change[] = [];
  for (const fp of jsonFiles) {
    const changes = processFile(fp, nameMax, shortMax, applyFix);
    allChanges.push(...changes);
  }

  if (allChanges.length === 0) {
    console.log('変更対象はありません。全フィールドが上限以内です。\n');
    return;
  }

  // 自治体ごとにグループ化して表示
  const grouped = new Map<string, Change[]>();
  for (const ch of allChanges) {
    const key = `${ch.municipalityName} (${ch.municipality})`;
    const list = grouped.get(key) ?? [];
    list.push(ch);
    grouped.set(key, list);
  }

  for (const [munLabel, changes] of grouped) {
    console.log(`--- ${munLabel} ---`);
    for (const ch of changes) {
      const arrow = applyFix ? '→' : '⇒';
      console.log(`  [${ch.field}] "${ch.before}" (${ch.before.length}文字) ${arrow} "${ch.after}" (${ch.after.length}文字)`);
    }
    console.log();
  }

  // サマリー
  const nameChanges = allChanges.filter((c) => c.field === 'name').length;
  const shortChanges = allChanges.filter((c) => c.field === 'shortName').length;

  console.log(`=== サマリー ===`);
  console.log(`${applyFix ? '修正済み' : '変更予定'}: ${allChanges.length} 件 (${grouped.size} 自治体)`);
  if (nameChanges > 0) console.log(`  name: ${nameChanges} 件`);
  if (shortChanges > 0) console.log(`  shortName: ${shortChanges} 件`);

  if (!applyFix) {
    console.log(`\n--fix を付けるとファイルに書き込みます:`);
    console.log(`  npx tsx scripts/adjustNameLength.ts --name-max ${nameMax} --short-max ${shortMax} --fix`);
  }

  console.log();
}

main();
