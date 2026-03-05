/**
 * 自治体JSONファイル内の不自然に切り詰められたテキストを検出するスクリプト
 *
 * 検出対象:
 *   1. shortName が name の途中で切れている (例: "ペットボトル" → "ペットボト")
 *   2. name 自体が既知のごみ用語の途中で切れている (例: "ペット" ← "ペットボトル")
 *   3. shortName が日本語として不自然に終わっている (助詞・接頭辞で終わる等)
 *
 * Usage:
 *   npx tsx scripts/detectTruncated.ts
 *   npx tsx scripts/detectTruncated.ts --fix   # 自動修正案を表示
 */

import * as fs from 'fs';
import * as path from 'path';

// ====================================================================
// 既知のごみ収集用語辞書（完全形）
// ====================================================================

const KNOWN_TERMS: string[] = [
  // 燃える系
  '燃えるごみ', '燃やすごみ', '燃やせるごみ',
  '燃えないごみ', '燃やさないごみ', '燃やせないごみ',
  '可燃ごみ', '不燃ごみ',
  // リサイクル系
  'ペットボトル', 'プラスチック', 'プラスチック類',
  '容器包装プラスチック', '容器包装プラスチック類',
  'リサイクルプラ', 'その他プラ', '容器プラ',
  // 資源系
  '資源ごみ', '資源物', '資源',
  'びん・缶', 'びん・缶・ペットボトル',
  '古紙・古布', '古紙', '古布', '段ボール',
  'ガラスびん', 'あきびん', 'あき缶', '空きびん', '空き缶',
  '金属類', '金属・陶器', 'ガラス・陶器',
  // 有害・危険
  '有害ごみ', '有害危険ごみ', '危険ごみ',
  // 粗大
  '粗大ごみ', '大型ごみ',
  // その他
  '雑がみ', '新聞', '雑誌', '衣類', '布類',
  '枝・葉・草', 'スプレー缶', '乾電池',
  '蛍光灯・水銀体温計', '蛍光管',
];

// 不自然な末尾パターン（日本語として単語が途中で切れている兆候）
const SUSPICIOUS_ENDINGS = [
  /ごみ$/,  // OK - 完全な語
];

// 途中で切れていると疑われる末尾文字・パターン
const TRUNCATED_ENDINGS: RegExp[] = [
  /[をにがでのはもへとくすずつづ]$/,       // 助詞で終わっている
  /プ$/,                                    // "プラスチック" の途中
  /ボト$/,                                  // "ボトル" の途中
  /リサイクル$/,                            // "リサイクルプラ" の途中 (文脈による)
  /ペッ$/,                                  // "ペット" の途中
  /スチッ$/,                                // "スチック" の途中
  /[ごご]$/,                                // "ごみ" の途中
];

// ====================================================================
// 検出ロジック
// ====================================================================

interface Issue {
  municipality: string;
  municipalityName: string;
  field: string;
  typeId: string;
  current: string;
  problem: string;
  suggestion?: string;
}

function findTruncatedInName(name: string): { problem: string; suggestion?: string } | null {
  // name が既知の用語の先頭部分に一致するが、完全一致ではない場合
  for (const term of KNOWN_TERMS) {
    if (term.startsWith(name) && term !== name && name.length >= 2) {
      return {
        problem: `"${name}" は "${term}" の途中で切れている可能性`,
        suggestion: term,
      };
    }
  }
  return null;
}

function findTruncatedShortName(
  shortName: string,
  name: string,
): { problem: string; suggestion?: string } | null {
  // shortName が name の先頭部分に一致するが name より短い
  if (name.startsWith(shortName) && shortName !== name) {
    // name 自体が十分短ければ shortName = name にすべき
    return {
      problem: `"${shortName}" は "${name}" の途中で切れている (${shortName.length}/${name.length}文字)`,
      suggestion: name,
    };
  }

  // shortName が不自然な末尾パターンに一致
  for (const pat of TRUNCATED_ENDINGS) {
    if (pat.test(shortName)) {
      // ただし name と完全一致なら問題なし（元のデータがそうなっている）
      if (shortName === name) continue;
      return {
        problem: `"${shortName}" は不自然な末尾で切れている`,
        suggestion: name,
      };
    }
  }

  return null;
}

function scanFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // 自治体JSONかどうかチェック
  if (!content.municipalityId || !content.garbageTypes) return [];

  const munId = content.municipalityId;
  const munName = content.municipalityName || munId;

  for (const gt of content.garbageTypes) {
    const name: string = gt.name || '';
    const shortName: string = gt.shortName || '';
    const typeId: string = gt.typeId || '';

    // 1. name 自体が切れていないかチェック
    const nameIssue = findTruncatedInName(name);
    if (nameIssue) {
      issues.push({
        municipality: munId,
        municipalityName: munName,
        field: 'name',
        typeId,
        current: name,
        problem: nameIssue.problem,
        suggestion: nameIssue.suggestion,
      });
    }

    // 2. shortName が不自然に切れていないかチェック
    const shortNameIssue = findTruncatedShortName(shortName, name);
    if (shortNameIssue) {
      issues.push({
        municipality: munId,
        municipalityName: munName,
        field: 'shortName',
        typeId,
        current: shortName,
        problem: shortNameIssue.problem,
        suggestion: shortNameIssue.suggestion,
      });
    }

    // 3. shortName が空文字の場合
    if (!shortName && name) {
      issues.push({
        municipality: munId,
        municipalityName: munName,
        field: 'shortName',
        typeId,
        current: '(空)',
        problem: 'shortName が未設定',
        suggestion: name,
      });
    }
  }

  return issues;
}

// ====================================================================
// メイン
// ====================================================================

function main() {
  const args = process.argv.slice(2);
  const showFix = args.includes('--fix');

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const jsonFiles = fs.readdirSync(dataDir)
    .filter((f) => f.endsWith('.json') && f !== 'holidays.json')
    .map((f) => path.join(dataDir, f));

  console.log(`\n=== 不自然に切り詰められたテキストの検出 ===\n`);
  console.log(`スキャン対象: ${jsonFiles.length} ファイル\n`);

  let totalIssues = 0;
  const allIssues: Issue[] = [];

  for (const filePath of jsonFiles) {
    const issues = scanFile(filePath);
    if (issues.length > 0) {
      allIssues.push(...issues);
      totalIssues += issues.length;
    }
  }

  // 自治体ごとにグループ化して表示
  const grouped = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    const key = `${issue.municipalityName} (${issue.municipality})`;
    const list = grouped.get(key) ?? [];
    list.push(issue);
    grouped.set(key, list);
  }

  for (const [munLabel, issues] of grouped) {
    console.log(`--- ${munLabel} ---`);
    for (const issue of issues) {
      console.log(`  [${issue.field}] ${issue.problem}`);
      if (showFix && issue.suggestion) {
        console.log(`    → 修正案: "${issue.suggestion}"`);
      }
    }
    console.log();
  }

  // サマリー
  console.log(`=== サマリー ===`);
  console.log(`検出された問題: ${totalIssues} 件 (${grouped.size} 自治体)`);

  if (totalIssues > 0) {
    const fieldCounts = new Map<string, number>();
    for (const issue of allIssues) {
      fieldCounts.set(issue.field, (fieldCounts.get(issue.field) ?? 0) + 1);
    }
    for (const [field, count] of fieldCounts) {
      console.log(`  ${field}: ${count} 件`);
    }
  }

  if (totalIssues > 0 && !showFix) {
    console.log(`\nヒント: --fix オプションを付けると修正案を表示します`);
    console.log(`  npx tsx scripts/detectTruncated.ts --fix`);
  }

  console.log();

  // 根本原因の特定
  if (totalIssues > 0) {
    console.log(`=== 根本原因 ===`);
    console.log(`scripts/fetch5374.ts 298行目の shortName 生成ロジック:`);
    console.log(`  shortName: cleanName.length > 5 ? cleanName.slice(0, 5) : cleanName`);
    console.log(`  → name が 6文字以上だと強制的に5文字で切り詰められます。`);
    console.log(`  → 日本語の単語境界を考慮していないため、不自然な切れ方になります。\n`);
  }
}

main();
