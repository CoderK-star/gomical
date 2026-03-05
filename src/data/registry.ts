import type { Municipality } from '../types/models';

export interface MunicipalityEntry {
  id: string;
  name: string;
  prefecture: string;
}

export interface PrefectureGroup {
  prefecture: string;
  municipalities: MunicipalityEntry[];
}

// 自治体の定義　各自治体のJSONファイルを遅延ロードするための関数を格納。
const dataModules: Record<string, () => Municipality> = {
  'edogawa': () => require('./edogawa.json') as Municipality,
  'fujiyoshida': () => require('./fujiyoshida.json') as Municipality,
  'hamamatsu': () => require('./hamamatsu.json') as Municipality,
  'ibaraki-town': () => require('./ibaraki-town.json') as Municipality,
  'iga': () => require('./iga.json') as Municipality,
  'itabashi': () => require('./itabashi.json') as Municipality,
  'kanazawa': () => require('./kanazawa.json') as Municipality,
  'kashiwa': () => require('./kashiwa.json') as Municipality,
  'misato': () => require('./misato.json') as Municipality,
  'muroran': () => require('./muroran.json') as Municipality,
  'nagareyama': () => require('./nagareyama.json') as Municipality,
  'saga': () => require('./saga.json') as Municipality,
  'sapporo': () => require('./sapporo.json') as Municipality,
  'sasayama': () => require('./sasayama.json') as Municipality,
  'setagaya': () => require('./setagaya.json') as Municipality,
  'tachikawa': () => require('./tachikawa.json') as Municipality,
  'tomigusuku': () => require('./tomigusuku.json') as Municipality,
  'toyama': () => require('./toyama.json') as Municipality,
  'yokosuka': () => require('./yokosuka.json') as Municipality,
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
