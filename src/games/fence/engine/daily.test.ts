import { describe, expect, it } from "vitest";
import { dailySeed, kstDateKey, prevDateKey, shiftDateKey } from "./daily";
import { generate } from "./generator";
import type { Size } from "./grid";
import { solve } from "./solver";

describe("kstDateKey", () => {
  it("KST 자정 경계: UTC 14:59:59와 15:00:00은 다른 날짜", () => {
    expect(kstDateKey(Date.UTC(2026, 10, 21, 14, 59, 59))).toBe("2026-11-21");
    expect(kstDateKey(Date.UTC(2026, 10, 21, 15, 0, 0))).toBe("2026-11-22");
  });

  it("월말과 연말", () => {
    expect(kstDateKey(Date.UTC(2026, 0, 31, 15, 0, 0))).toBe("2026-02-01");
    expect(kstDateKey(Date.UTC(2026, 11, 31, 14, 59, 59))).toBe("2026-12-31");
    expect(kstDateKey(Date.UTC(2026, 11, 31, 15, 0, 0))).toBe("2027-01-01");
    expect(kstDateKey(Date.UTC(2028, 1, 28, 15, 0, 0))).toBe("2028-02-29");
  });
});

describe("prevDateKey, shiftDateKey", () => {
  it("하루 전", () => {
    expect(prevDateKey("2026-11-22")).toBe("2026-11-21");
    expect(prevDateKey("2026-03-01")).toBe("2026-02-28");
    expect(prevDateKey("2028-03-01")).toBe("2028-02-29");
    expect(prevDateKey("2027-01-01")).toBe("2026-12-31");
  });

  it("며칠 뒤", () => {
    expect(shiftDateKey("2026-12-30", 3)).toBe("2027-01-02");
    expect(shiftDateKey("2026-11-22", -29)).toBe("2026-10-24");
  });
});

describe("오늘의 판", () => {
  it("시드 형식", () => {
    expect(dailySeed("2026-11-22")).toBe("daily-2026-11-22");
  });

  it("같은 날짜와 크기는 같은 clues", () => {
    for (const size of [5, 7, 10] as Size[]) {
      const a = generate(size, dailySeed("2026-11-22"));
      const b = generate(size, dailySeed("2026-11-22"));
      expect(a).toEqual(b);
    }
  });

  it("연속 30일의 판은 크기별로 모두 서로 다르다", () => {
    for (const size of [5, 7, 10] as Size[]) {
      const seen = new Set<string>();
      let key = "2026-11-22";
      for (let i = 0; i < 30; i++) {
        seen.add(JSON.stringify(generate(size, dailySeed(key)).clues));
        key = shiftDateKey(key, 1);
      }
      expect(seen.size).toBe(30);
    }
  }, 60_000);

  it("오늘의 판도 유일해", () => {
    let key = "2026-11-22";
    for (let i = 0; i < 5; i++) {
      for (const size of [5, 7, 10] as Size[]) {
        const r = solve(generate(size, dailySeed(key)), { limit: 2 });
        expect(r.exhausted).toBe(false);
        expect(r.count).toBe(1);
      }
      key = shiftDateKey(key, 1);
    }
  }, 60_000);
});
