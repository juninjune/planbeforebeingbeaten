import { shiftDateKey } from "./engine/daily";

export type SizeKey = "5" | "7" | "10";
const SIZE_KEYS: SizeKey[] = ["5", "7", "10"];

export interface FenceRecords {
  v: 1;
  sizes: Record<SizeKey, { best: number | null; solved: number }>;
  daily: {
    /** 날짜별, 크기별 첫 완성 기록. 최근 30일만 보관 */
    done: Record<string, Partial<Record<SizeKey, { ms: number }>>>;
    streak: number;
    last: string | null;
  };
}

export const STORAGE_KEY = "fence.records.v1";
const KEEP_DAYS = 30;

export function emptyRecords(): FenceRecords {
  return {
    v: 1,
    sizes: { "5": { best: null, solved: 0 }, "7": { best: null, solved: 0 }, "10": { best: null, solved: 0 } },
    daily: { done: {}, streak: 0, last: null },
  };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isMs = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isDateKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 깨진 값이나 버전이 다른 값은 빈 기록으로 돌린다 */
export function parseRecords(text: string | null | undefined): FenceRecords {
  if (!text) return emptyRecords();
  try {
    const raw = JSON.parse(text) as Record<string, any>;
    if (!raw || raw.v !== 1) return emptyRecords();
    const out = emptyRecords();
    for (const k of SIZE_KEYS) {
      const s = raw.sizes?.[k];
      if (!s || !isCount(s.solved) || !(s.best === null || isMs(s.best))) return emptyRecords();
      out.sizes[k] = { best: s.best, solved: s.solved };
    }
    const d = raw.daily;
    if (!d || !isCount(d.streak) || !(d.last === null || isDateKey(d.last)) || typeof d.done !== "object" || d.done === null) {
      return emptyRecords();
    }
    for (const [date, entry] of Object.entries(d.done as Record<string, any>)) {
      if (!isDateKey(date) || typeof entry !== "object" || entry === null) return emptyRecords();
      const kept: Partial<Record<SizeKey, { ms: number }>> = {};
      for (const k of SIZE_KEYS) {
        if (entry[k] === undefined) continue;
        if (!isMs(entry[k]?.ms)) return emptyRecords();
        kept[k] = { ms: entry[k].ms };
      }
      out.daily.done[date] = kept;
    }
    out.daily.streak = d.streak;
    out.daily.last = d.last;
    return out;
  } catch {
    return emptyRecords();
  }
}

export interface Completion {
  size: number;
  ms: number;
  hints: number;
  /** 오늘의 판이면 그 판의 날짜, 자유 판이면 null */
  dailyKey: string | null;
}

export interface CompletionResult {
  records: FenceRecords;
  /** 최고 기록을 갱신했는가 */
  newBest: boolean;
}

/** 완성 한 번을 기록에 반영한 새 기록을 돌려준다. 입력은 바꾸지 않는다 */
export function applyCompletion(records: FenceRecords, c: Completion): CompletionResult {
  const key = String(c.size) as SizeKey;
  const next: FenceRecords = JSON.parse(JSON.stringify(records));
  const slot = next.sizes[key];
  slot.solved += 1;
  let newBest = false;
  if (c.hints === 0 && (slot.best === null || c.ms < slot.best)) {
    slot.best = c.ms;
    newBest = true;
  }

  if (c.dailyKey) {
    const day = (next.daily.done[c.dailyKey] ??= {});
    if (!day[key]) day[key] = { ms: c.ms };
    if (next.daily.last !== c.dailyKey) {
      next.daily.streak = next.daily.last === shiftDateKey(c.dailyKey, -1) ? next.daily.streak + 1 : 1;
      next.daily.last = c.dailyKey;
    }
    const oldest = shiftDateKey(c.dailyKey, -(KEEP_DAYS - 1));
    for (const date of Object.keys(next.daily.done)) {
      if (date < oldest) delete next.daily.done[date];
    }
  }
  return { records: next, newBest };
}

/** 표시용 연속 일수. 마지막으로 푼 날이 오늘이나 어제가 아니면 0 */
export function currentStreak(records: FenceRecords, todayKey: string): number {
  const { last, streak } = records.daily;
  return last === todayKey || last === shiftDateKey(todayKey, -1) ? streak : 0;
}

export function loadRecords(): FenceRecords {
  try {
    return parseRecords(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyRecords();
  }
}

export function saveRecords(records: FenceRecords): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 저장소를 쓸 수 없어도 게임은 계속된다
  }
}
