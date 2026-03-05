import type { GarbageType, Municipality } from '../types/models';

export interface SearchResult {
  keyword: string;
  garbageType: GarbageType;
  notes?: string;
  matchType: 'exact' | 'alias' | 'local' | 'description' | 'fuzzy';
}

interface SearchEntry {
  keyword: string;
  aliases: string[];
  garbageTypeId: string;
  notes?: string;
}

// Static require map – Metro bundler needs literal paths.
const searchModules: Record<string, () => SearchEntry[]> = {
  'echizen': () => require('../data/search/echizen.json') as SearchEntry[],
  'edogawa': () => require('../data/search/edogawa.json') as SearchEntry[],
  'fujiyoshida': () => require('../data/search/fujiyoshida.json') as SearchEntry[],
  'hamamatsu': () => require('../data/search/hamamatsu.json') as SearchEntry[],
  'ibaraki-town': () => require('../data/search/ibaraki-town.json') as SearchEntry[],
  'iga': () => require('../data/search/iga.json') as SearchEntry[],
  'itabashi': () => require('../data/search/itabashi.json') as SearchEntry[],
  'kanazawa': () => require('../data/search/kanazawa.json') as SearchEntry[],
  'kashiwa': () => require('../data/search/kashiwa.json') as SearchEntry[],
  'misato': () => require('../data/search/misato.json') as SearchEntry[],
  'muroran': () => require('../data/search/muroran.json') as SearchEntry[],
  'saga': () => require('../data/search/saga.json') as SearchEntry[],
  'sapporo': () => require('../data/search/sapporo.json') as SearchEntry[],
  'sasayama': () => require('../data/search/sasayama.json') as SearchEntry[],
  'setagaya': () => require('../data/search/setagaya.json') as SearchEntry[],
  'tachikawa': () => require('../data/search/tachikawa.json') as SearchEntry[],
  'tomigusuku': () => require('../data/search/tomigusuku.json') as SearchEntry[],
  'toyama': () => require('../data/search/toyama.json') as SearchEntry[],
  'yokosuka': () => require('../data/search/yokosuka.json') as SearchEntry[],
};

const localSearchCache = new Map<string, SearchEntry[] | null>();

// Load per-municipality search data from JSON files.
function loadLocalSearchData(municipalityId: string): SearchEntry[] | null {
  if (localSearchCache.has(municipalityId)) {
    return localSearchCache.get(municipalityId) ?? null;
  }
  const loader = searchModules[municipalityId];
  if (!loader) {
    localSearchCache.set(municipalityId, null);
    return null;
  }
  const data = loader();
  localSearchCache.set(municipalityId, data);
  return data;
}

// Generic fallback dictionary (~70 entries covering the most universal items).
// Uses standard typeIds (burnable, plastic, non-burnable, petbottle, hazardous).
const COMMON_ITEMS: SearchEntry[] = [
  // 燃やすごみ
  { keyword: '生ごみ', aliases: ['なまごみ', '食べ残し', '残飯', '野菜くず', '果物の皮', '魚の骨', '卵の殻'], garbageTypeId: 'burnable' },
  { keyword: '紙くず', aliases: ['かみくず', 'ティッシュ', 'ちり紙', 'レシート', 'キッチンペーパー'], garbageTypeId: 'burnable' },
  { keyword: '衣類', aliases: ['いるい', '服', '洋服', 'Tシャツ', 'ズボン', 'スカート', '下着', '靴下', 'タオル', '毛布', 'カーテン'], garbageTypeId: 'burnable' },
  { keyword: '革製品', aliases: ['かわせいひん', 'カバン', 'バッグ', 'リュック', '財布', 'ベルト'], garbageTypeId: 'burnable' },
  { keyword: '靴', aliases: ['くつ', 'スニーカー', 'サンダル', 'ブーツ', 'スリッパ', '運動靴'], garbageTypeId: 'burnable' },
  { keyword: '木くず', aliases: ['きくず', '割り箸', '枝', '落ち葉'], garbageTypeId: 'burnable' },
  { keyword: 'おむつ', aliases: ['オムツ', 'おしめ', '紙おむつ'], garbageTypeId: 'burnable', notes: '汚物を取り除いてから出す' },
  { keyword: 'ぬいぐるみ', aliases: ['人形', 'クッション', '座布団'], garbageTypeId: 'burnable' },
  { keyword: 'CD・DVD', aliases: ['CD', 'DVD', 'ブルーレイ', 'カセットテープ', 'ビデオテープ'], garbageTypeId: 'burnable' },
  { keyword: 'おもちゃ', aliases: ['玩具', 'フィギュア', 'ブロック'], garbageTypeId: 'burnable' },
  { keyword: '布団', aliases: ['ふとん', '掛け布団', '敷き布団', 'マットレス'], garbageTypeId: 'burnable', notes: '大きい場合は粗大ごみ' },

  // 容器包装プラスチック
  { keyword: 'プラスチック容器', aliases: ['プラ容器', 'トレイ', '食品トレイ', '弁当容器', '卵パック'], garbageTypeId: 'plastic' },
  { keyword: 'ビニール袋', aliases: ['ポリ袋', 'レジ袋', 'お菓子の袋'], garbageTypeId: 'plastic' },
  { keyword: 'ラップ', aliases: ['食品ラップ', 'サランラップ'], garbageTypeId: 'plastic' },
  { keyword: '発泡スチロール', aliases: ['はっぽう', 'スチロール', '緩衝材', 'プチプチ'], garbageTypeId: 'plastic' },
  { keyword: 'シャンプーボトル', aliases: ['ボトル', 'リンス', '洗剤ボトル'], garbageTypeId: 'plastic' },

  // 燃やさないごみ
  { keyword: '金属', aliases: ['きんぞく', 'フライパン', '鍋', 'やかん', 'アルミホイル'], garbageTypeId: 'non-burnable' },
  { keyword: 'ガラス', aliases: ['がらす', 'コップ', 'グラス', '花瓶'], garbageTypeId: 'non-burnable', notes: '新聞紙等に包んで「キケン」と表示' },
  { keyword: '陶器', aliases: ['とうき', '茶碗', '皿', '食器', 'マグカップ'], garbageTypeId: 'non-burnable' },
  { keyword: '傘', aliases: ['かさ', '日傘', 'ビニール傘'], garbageTypeId: 'non-burnable' },
  { keyword: '小型家電', aliases: ['ドライヤー', 'アイロン', '電卓', 'トースター'], garbageTypeId: 'non-burnable' },
  { keyword: '自転車', aliases: ['じてんしゃ', 'チャリ', '自転車部品'], garbageTypeId: 'non-burnable', notes: '粗大ごみとなる場合あり。自治体に確認を' },
  { keyword: '携帯電話', aliases: ['スマホ', 'スマートフォン', 'ガラケー', 'タブレット'], garbageTypeId: 'non-burnable', notes: '小型家電リサイクル回収も利用可' },
  { keyword: 'パソコン', aliases: ['PC', 'ノートパソコン', 'キーボード', 'マウス'], garbageTypeId: 'non-burnable', notes: 'メーカーリサイクルが基本' },
  { keyword: '時計', aliases: ['とけい', '腕時計', '目覚まし時計'], garbageTypeId: 'non-burnable' },
  { keyword: '掃除機', aliases: ['そうじき'], garbageTypeId: 'non-burnable', notes: '大きさにより粗大ごみの場合あり' },
  { keyword: '充電器', aliases: ['ACアダプター', 'USBケーブル', 'コード', '延長コード'], garbageTypeId: 'non-burnable' },

  // ペットボトル
  { keyword: 'ペットボトル', aliases: ['PETボトル', 'ペット'], garbageTypeId: 'petbottle', notes: 'キャップとラベルは外してプラスチックへ' },

  // 有害危険ごみ
  { keyword: '蛍光灯', aliases: ['けいこうとう', '蛍光管'], garbageTypeId: 'hazardous' },
  { keyword: '乾電池', aliases: ['かんでんち', '電池', 'ボタン電池', '充電池'], garbageTypeId: 'hazardous' },
  { keyword: 'スプレー缶', aliases: ['エアゾール', 'ガス缶', 'カセットボンベ'], garbageTypeId: 'hazardous', notes: '使い切ってから出す' },
  { keyword: '刃物', aliases: ['はもの', '包丁', 'カッター', 'ハサミ', 'ナイフ', 'カミソリ'], garbageTypeId: 'hazardous', notes: '紙に包んで「刃物」「キケン」と表示' },
  { keyword: 'ライター', aliases: ['ガスライター', 'チャッカマン'], garbageTypeId: 'hazardous', notes: '使い切ってから出す' },

  // 資源ごみ
  { keyword: '新聞紙', aliases: ['しんぶんし', '新聞', 'チラシ'], garbageTypeId: 'burnable', notes: '資源回収がある自治体はそちらを優先' },
  { keyword: '段ボール', aliases: ['だんぼーる', 'ダンボール'], garbageTypeId: 'burnable', notes: '資源回収がある自治体はそちらを優先' },
  { keyword: '缶', aliases: ['かん', 'アルミ缶', 'スチール缶', '空き缶'], garbageTypeId: 'non-burnable', notes: '中をすすぐ。資源回収の自治体はそちらへ' },
  { keyword: 'びん', aliases: ['瓶', 'ビン', 'ガラスびん', '空き瓶'], garbageTypeId: 'non-burnable', notes: '中をすすぐ。資源回収の自治体はそちらへ' },

  // 家電リサイクル法対象
  { keyword: 'エアコン', aliases: ['えあこん', 'クーラー'], garbageTypeId: 'non-burnable', notes: '⚠ 家電リサイクル法対象。家電販売店に引取依頼' },
  { keyword: 'テレビ', aliases: ['てれび', 'TV', '液晶テレビ'], garbageTypeId: 'non-burnable', notes: '⚠ 家電リサイクル法対象。家電販売店に引取依頼' },
  { keyword: '冷蔵庫', aliases: ['れいぞうこ', '冷凍庫'], garbageTypeId: 'non-burnable', notes: '⚠ 家電リサイクル法対象。家電販売店に引取依頼' },
  { keyword: '洗濯機', aliases: ['せんたくき', '洗濯乾燥機'], garbageTypeId: 'non-burnable', notes: '⚠ 家電リサイクル法対象。家電販売店に引取依頼' },
];

/**
 * Normalize a string for matching: lowercase, katakana→hiragana, strip punctuation.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s・、。()（）「」『』\-\/]/g, '');
}

/**
 * Try to match a garbage type by typeId OR by name substring.
 * This handles both standard IDs (burnable) and 5374-derived IDs (燃やせるごみ-スプレー缶).
 */
function resolveGarbageType(
  typeId: string,
  typeMap: Map<string, GarbageType>,
  typeList: GarbageType[],
): GarbageType | null {
  // Direct match by typeId
  if (typeMap.has(typeId)) return typeMap.get(typeId)!;

  // Fuzzy match by name
  const norm = normalize(typeId);
  for (const gt of typeList) {
    const gtNorm = normalize(gt.typeId);
    const nameNorm = normalize(gt.name);
    if (gtNorm === norm || nameNorm === norm) return gt;
    if (nameNorm.includes(norm) || norm.includes(nameNorm)) return gt;
  }
  return null;
}

export function searchItems(query: string, municipality: Municipality): SearchResult[] {
  if (!query || query.trim().length === 0) return [];

  const q = normalize(query);
  const typeMap = new Map(municipality.garbageTypes.map((t) => [t.typeId, t]));
  const typeList = municipality.garbageTypes;
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const addResult = (
    keyword: string,
    typeId: string,
    notes: string | undefined,
    matchType: SearchResult['matchType'],
  ) => {
    const key = `${keyword}::${typeId}`;
    if (seen.has(key)) return;
    const gt = resolveGarbageType(typeId, typeMap, typeList);
    if (!gt) return;
    seen.add(key);
    results.push({ keyword, garbageType: gt, notes, matchType });
  };

  // Phase 1: Municipality-specific search data (highest priority)
  const localData = loadLocalSearchData(municipality.municipalityId);
  if (localData) {
    for (const item of localData) {
      const keyNorm = normalize(item.keyword);
      if (keyNorm.includes(q) || q.includes(keyNorm)) {
        addResult(item.keyword, item.garbageTypeId, item.notes, 'local');
        continue;
      }
      if (item.aliases.some((a) => { const aN = normalize(a); return aN.includes(q) || q.includes(aN); })) {
        addResult(item.keyword, item.garbageTypeId, item.notes, 'local');
      }
    }
  }

  // Phase 2: Generic dictionary
  for (const item of COMMON_ITEMS) {
    const keyNorm = normalize(item.keyword);
    if (keyNorm.includes(q) || q.includes(keyNorm)) {
      addResult(item.keyword, item.garbageTypeId, item.notes, 'exact');
      continue;
    }
    if (item.aliases.some((a) => { const aN = normalize(a); return aN.includes(q) || q.includes(aN); })) {
      addResult(item.keyword, item.garbageTypeId, item.notes, 'alias');
    }
  }

  // Phase 3: Match against garbage type descriptions and rules
  if (results.length === 0) {
    for (const gt of typeList) {
      const descNorm = normalize(gt.description || '');
      const rulesNorm = gt.rules.map(normalize);
      if (descNorm.includes(q) || rulesNorm.some((r) => r.includes(q))) {
        addResult(query.trim(), gt.typeId, `「${gt.name}」の説明に該当する可能性があります`, 'description');
      }
    }
  }

  // Phase 4: Fuzzy substring (2+ chars, if still nothing found)
  if (results.length === 0 && q.length >= 2) {
    const allItems = [...(localData || []), ...COMMON_ITEMS];
    for (const item of allItems) {
      const allTexts = [item.keyword, ...item.aliases].map(normalize);
      const fuzzy = allTexts.some((t) => {
        for (let i = 0; i <= t.length - 2; i++) {
          if (q.includes(t.slice(i, i + 2))) return true;
        }
        return false;
      });
      if (fuzzy) {
        const gt = resolveGarbageType(item.garbageTypeId, typeMap, typeList);
        if (gt) addResult(item.keyword, item.garbageTypeId, item.notes, 'fuzzy');
      }
    }
  }

  // Sort: local (5374) > exact > alias > description > fuzzy
  const order: Record<string, number> = { local: 0, exact: 1, alias: 2, description: 3, fuzzy: 4 };
  results.sort((a, b) => order[a.matchType] - order[b.matchType]);

  return results;
}

export function getAllCategories(municipality: Municipality): Array<{ garbageType: GarbageType; items: string[] }> {
  const typeMap = new Map(municipality.garbageTypes.map((t) => [t.typeId, t]));
  const typeList = municipality.garbageTypes;
  const grouped = new Map<string, Set<string>>();

  // Use local data if available, fall back to COMMON_ITEMS
  const localData = loadLocalSearchData(municipality.municipalityId);
  const items = localData && localData.length > 0 ? localData : COMMON_ITEMS;

  for (const item of items) {
    const gt = resolveGarbageType(item.garbageTypeId, typeMap, typeList);
    if (!gt) continue;
    const existing = grouped.get(gt.typeId) ?? new Set<string>();
    existing.add(item.keyword);
    grouped.set(gt.typeId, existing);
  }

  return Array.from(grouped.entries())
    .map(([typeId, itemSet]) => {
      const gt = typeMap.get(typeId);
      if (!gt) return null;
      const itemsArr = Array.from(itemSet).slice(0, 20);
      return { garbageType: gt, items: itemsArr };
    })
    .filter(Boolean) as Array<{ garbageType: GarbageType; items: string[] }>;
}
