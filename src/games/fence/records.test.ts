import { describe, expect, it } from "vitest";
import {
  applyCompletion,
  currentStreak,
  emptyRecords,
  parseRecords,
  type Completion,
  type FenceRecords,
} from "./records";

const free = (size: number, ms: number, hints = 0): Completion => ({ size, ms, hints, dailyKey: null });
const daily = (size: number, ms: number, dailyKey: string): Completion => ({ size, ms, hints: 0, dailyKey });
const apply = (r: FenceRecords, c: Completion) => applyCompletion(r, c).records;

describe("크기별 기록", () => {
  it("기록이 없으면 첫 완성이 최고 기록이 되고 푼 판 수가 1", () => {
    const r = applyCompletion(emptyRecords(), free(7, 41200));
    expect(r.newBest).toBe(true);
    expect(r.records.sizes["7"]).toEqual({ best: 41200, solved: 1 });
    expect(r.records.sizes["5"]).toEqual({ best: null, solved: 0 });
  });

  it("더 빠르면 갱신, 느리면 푼 판 수만 늘어난다", () => {
    let r = apply(emptyRecords(), free(7, 41200));
    const faster = applyCompletion(r, free(7, 30000));
    expect(faster.newBest).toBe(true);
    expect(faster.records.sizes["7"]).toEqual({ best: 30000, solved: 2 });
    const slower = applyCompletion(faster.records, free(7, 50000));
    expect(slower.newBest).toBe(false);
    expect(slower.records.sizes["7"]).toEqual({ best: 30000, solved: 3 });
    r = apply(slower.records, free(7, 30000));
    expect(r.sizes["7"]!.best).toBe(30000);
  });

  it("같은 시간은 갱신이 아니다", () => {
    const r = apply(emptyRecords(), free(5, 1000));
    expect(applyCompletion(r, free(5, 1000)).newBest).toBe(false);
  });

  it("힌트를 쓴 완성은 푼 판 수만 늘고 최고 기록은 그대로", () => {
    const first = applyCompletion(emptyRecords(), free(10, 5000, 2));
    expect(first.newBest).toBe(false);
    expect(first.records.sizes["10"]).toEqual({ best: null, solved: 1 });
    const r = apply(first.records, free(10, 9000));
    const hinted = applyCompletion(r, free(10, 1000, 1));
    expect(hinted.newBest).toBe(false);
    expect(hinted.records.sizes["10"]).toEqual({ best: 9000, solved: 3 });
  });

  it("입력을 바꾸지 않는다", () => {
    const base = emptyRecords();
    const snapshot = JSON.stringify(base);
    applyCompletion(base, daily(7, 1000, "2026-11-22"));
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe("오늘의 판과 연속 일수", () => {
  it("첫 완성은 연속 1일", () => {
    const r = apply(emptyRecords(), daily(7, 41200, "2026-11-22"));
    expect(r.daily.streak).toBe(1);
    expect(r.daily.last).toBe("2026-11-22");
    expect(r.daily.done["2026-11-22"]).toEqual({ "7": { ms: 41200 } });
  });

  it("어제 푼 사람이 오늘 풀면 +1", () => {
    let r = apply(emptyRecords(), daily(7, 1, "2026-11-21"));
    r = apply(r, daily(7, 1, "2026-11-22"));
    expect(r.daily.streak).toBe(2);
  });

  it("같은 날 다른 크기를 풀어도 연속 일수는 그대로", () => {
    let r = apply(emptyRecords(), daily(7, 1, "2026-11-21"));
    r = apply(r, daily(7, 1, "2026-11-22"));
    r = apply(r, daily(5, 1, "2026-11-22"));
    expect(r.daily.streak).toBe(2);
    expect(Object.keys(r.daily.done["2026-11-22"]!).sort()).toEqual(["5", "7"]);
  });

  it("건너뛰면 1로 돌아간다", () => {
    let r = apply(emptyRecords(), daily(7, 1, "2026-11-20"));
    r = apply(r, daily(7, 1, "2026-11-22"));
    expect(r.daily.streak).toBe(1);
  });

  it("월말과 연말을 넘어도 이어진다", () => {
    let r = apply(emptyRecords(), daily(7, 1, "2026-12-31"));
    r = apply(r, daily(7, 1, "2027-01-01"));
    expect(r.daily.streak).toBe(2);
  });

  it("그날 기록은 처음 완성한 것으로 고정되지만 크기별 기록은 일반 규칙대로", () => {
    const first = apply(emptyRecords(), daily(7, 50000, "2026-11-22"));
    const again = applyCompletion(first, daily(7, 30000, "2026-11-22"));
    expect(again.records.daily.done["2026-11-22"]!["7"]).toEqual({ ms: 50000 });
    expect(again.records.daily.streak).toBe(1);
    expect(again.newBest).toBe(true);
    expect(again.records.sizes["7"]).toEqual({ best: 30000, solved: 2 });
  });

  it("표시용 연속 일수: 오늘이나 어제면 유지, 아니면 0", () => {
    const r = apply(apply(emptyRecords(), daily(7, 1, "2026-11-20")), daily(7, 1, "2026-11-21"));
    expect(currentStreak(r, "2026-11-21")).toBe(2);
    expect(currentStreak(r, "2026-11-22")).toBe(2);
    expect(currentStreak(r, "2026-11-23")).toBe(0);
    expect(currentStreak(emptyRecords(), "2026-11-22")).toBe(0);
  });

  it("그저께 이후로 안 푼 사람이 오늘 풀면 1", () => {
    let r = apply(emptyRecords(), daily(7, 1, "2026-11-19"));
    expect(currentStreak(r, "2026-11-22")).toBe(0);
    r = apply(r, daily(7, 1, "2026-11-22"));
    expect(currentStreak(r, "2026-11-22")).toBe(1);
  });

  it("daily.done은 최근 30일만 남긴다", () => {
    let r = emptyRecords();
    let day = "2026-10-01";
    const days: string[] = [];
    for (let i = 0; i < 40; i++) {
      days.push(day);
      r = apply(r, daily(5, 1, day));
      const [y, m, d] = day.split("-").map(Number) as [number, number, number];
      day = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    }
    const keys = Object.keys(r.daily.done).sort();
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe(days[10]);
    expect(keys.at(-1)).toBe(days[39]);
    expect(r.daily.streak).toBe(40);
  });

  it("자유 판은 오늘의 판 기록과 연속 일수를 건드리지 않는다", () => {
    const r = apply(emptyRecords(), free(7, 1000));
    expect(r.daily).toEqual({ done: {}, streak: 0, last: null });
  });
});

describe("parseRecords", () => {
  it("저장했다가 읽으면 같다", () => {
    const r = apply(apply(emptyRecords(), free(7, 100)), daily(5, 200, "2026-11-22"));
    expect(parseRecords(JSON.stringify(r))).toEqual(r);
  });

  it("없거나 깨진 값은 빈 기록", () => {
    expect(parseRecords(null)).toEqual(emptyRecords());
    expect(parseRecords("")).toEqual(emptyRecords());
    expect(parseRecords("{oops")).toEqual(emptyRecords());
    expect(parseRecords("[]")).toEqual(emptyRecords());
    expect(parseRecords("null")).toEqual(emptyRecords());
  });

  it("버전이 다르거나 모양이 틀리면 빈 기록", () => {
    const good = JSON.parse(JSON.stringify(apply(emptyRecords(), free(7, 100))));
    expect(parseRecords(JSON.stringify({ ...good, v: 2 }))).toEqual(emptyRecords());
    expect(parseRecords(JSON.stringify({ ...good, sizes: { "5": {} } }))).toEqual(emptyRecords());
    expect(parseRecords(JSON.stringify({ ...good, daily: { done: {}, streak: -1, last: null } }))).toEqual(emptyRecords());
    expect(parseRecords(JSON.stringify({ ...good, daily: { done: { nope: {} }, streak: 0, last: null } }))).toEqual(emptyRecords());
  });
});
