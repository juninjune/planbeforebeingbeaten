import { describe, expect, it } from "vitest";
import { buildShareParams, judgeChallenge, parseChallenge } from "./challenge";

describe("parseChallenge", () => {
  it("유효한 값", () => {
    expect(parseChallenge({ ct: "41200", ch: "0" })).toEqual({ ms: 41200, hints: 0 });
    expect(parseChallenge({ ct: "41200" })).toEqual({ ms: 41200, hints: 0 });
    expect(parseChallenge({ ct: "1" })).toEqual({ ms: 1, hints: 0 });
    expect(parseChallenge({ ct: "86400000", ch: "999" })).toEqual({ ms: 86400000, hints: 999 });
    expect(parseChallenge({ ct: "100", ch: "3", size: "7", seed: "x" })).toEqual({ ms: 100, hints: 3 });
  });

  it.each([
    ["abc", {}],
    ["음수", { ct: "-5" }],
    ["0", { ct: "0" }],
    ["소수", { ct: "1.5" }],
    ["지수 표기", { ct: "1e5" }],
    ["앞 공백", { ct: " 100" }],
    ["뒤 공백", { ct: "100 " }],
    ["빈 문자열", { ct: "" }],
    ["범위 밖", { ct: "86400001" }],
    ["부호", { ct: "+100" }],
    ["16진", { ct: "0x10" }],
    ["문자 섞임", { ct: "12a" }],
    ["아주 긴 숫자", { ct: "99999999999999999999" }],
  ])("무효한 ct: %s", (_name, params) => {
    expect(parseChallenge(params as Record<string, string>)).toBeNull();
  });

  it("ct가 없으면 null", () => {
    expect(parseChallenge({})).toBeNull();
    expect(parseChallenge({ ch: "1" })).toBeNull();
  });

  it.each([["-1"], ["x"], ["1000"], ["1.5"], [""], [" 1"], ["1e1"]])("무효한 ch(%s)이면 도전 전체가 null", (ch) => {
    expect(parseChallenge({ ct: "100", ch })).toBeNull();
  });
});

describe("buildShareParams", () => {
  it("왕복", () => {
    const params = buildShareParams({ size: 7, seed: "k3f9", ms: 41200, hints: 2 });
    expect(params).toEqual({ size: "7", seed: "k3f9", ct: "41200", ch: "2" });
    expect(parseChallenge(params)).toEqual({ ms: 41200, hints: 2 });
  });

  it("오늘의 판은 seed에 dailySeed를 넣고 daily 파라미터는 없다", () => {
    const params = buildShareParams({ size: 5, seed: "daily-2026-11-22", ms: 5000, hints: 0 });
    expect(params.seed).toBe("daily-2026-11-22");
    expect("daily" in params).toBe(false);
  });

  it("범위를 벗어나는 값은 유효한 범위로 맞춘다", () => {
    expect(parseChallenge(buildShareParams({ size: 5, seed: "a", ms: 0, hints: 0 }))).toEqual({ ms: 1, hints: 0 });
    expect(parseChallenge(buildShareParams({ size: 5, seed: "a", ms: 1e9, hints: 5000 }))).toEqual({ ms: 86400000, hints: 999 });
    expect(parseChallenge(buildShareParams({ size: 5, seed: "a", ms: 1234.6, hints: 0 }))?.ms).toBe(1235);
  });
});

describe("judgeChallenge", () => {
  const ch = { ms: 10000, hints: 1 };
  it("win", () => {
    expect(judgeChallenge(ch, { ms: 6800, hints: 1 })).toEqual({ outcome: "win", diffMs: 3200 });
    expect(judgeChallenge(ch, { ms: 9999, hints: 0 })).toEqual({ outcome: "win", diffMs: 1 });
  });
  it("lose", () => {
    expect(judgeChallenge(ch, { ms: 15000, hints: 1 })).toEqual({ outcome: "lose", diffMs: 5000 });
  });
  it("tie", () => {
    expect(judgeChallenge(ch, { ms: 10000, hints: 0 })).toEqual({ outcome: "tie", diffMs: 0 });
  });
  it("assisted: 힌트를 더 쓰면 시간과 무관", () => {
    expect(judgeChallenge(ch, { ms: 1, hints: 2 }).outcome).toBe("assisted");
    expect(judgeChallenge(ch, { ms: 99999, hints: 2 }).outcome).toBe("assisted");
    expect(judgeChallenge({ ms: 100, hints: 0 }, { ms: 50, hints: 1 }).outcome).toBe("assisted");
  });
});
