import { describe, expect, it } from "vitest";
import { FIXED_PUZZLE } from "./fixtures";
import { ALLOWED_TABLE, GENERATOR_VERSION, generate, generateDetailed } from "./generator";
import type { Puzzle, Size } from "./grid";
import { isSolved } from "./judge";
import { solve } from "./solver";

const SIZES: Size[] = [5, 7, 10];
const SEEDS = Array.from({ length: 100 }, (_, i) => `seed-${i}`);

/** 칸 집합이 4방향으로 이어져 있는가 (target 값인 칸들, 판 바깥을 포함할지 선택) */
function connected(region: Uint8Array, size: number, want: 0 | 1, withOutside: boolean): boolean {
  const W = size + 2;
  const grid = new Uint8Array(W * W).fill(withOutside ? 0 : 9);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) grid[(r + 1) * W + c + 1] = region[r * size + c]!;
  const cells: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] === want) cells.push(i);
  if (cells.length === 0) return true;
  const seen = new Set<number>([cells[0]!]);
  const stack = [cells[0]!];
  while (stack.length) {
    const p = stack.pop()!;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q >= 0 && q < grid.length && grid[q] === want && !seen.has(q)) {
        seen.add(q);
        stack.push(q);
      }
    }
  }
  return seen.size === cells.length;
}

/** 풀이기와 무관한 5x5 검증기: 칸의 안/밖 배치를 가지치기하며 열거해 조건을 만족하는 배치 수를 센다 */
function countByEnumeration(puzzle: Puzzle): number {
  const n = 5;
  const inside = new Array<number>(n * n).fill(0);
  const at = (r: number, c: number) => (r < 0 || r >= n || c < 0 || c >= n ? 0 : inside[r * n + c]!);
  const clueOk = (r: number, c: number): boolean => {
    const clue = puzzle.clues[r * n + c];
    if (clue === null || clue === undefined) return true;
    const v = at(r, c);
    let k = 0;
    if (at(r - 1, c) !== v) k++;
    if (at(r + 1, c) !== v) k++;
    if (at(r, c - 1) !== v) k++;
    if (at(r, c + 1) !== v) k++;
    return k === clue;
  };
  let found = 0;
  const dfs = (i: number): void => {
    if (i === n * n) {
      for (let c = 0; c < n; c++) if (!clueOk(n - 1, c)) return;
      const region = Uint8Array.from(inside);
      if (region.some((v) => v === 1) && connected(region, n, 1, false) && connected(region, n, 0, true)) found++;
      return;
    }
    const r = Math.floor(i / n);
    const c = i % n;
    for (const v of [0, 1]) {
      inside[i] = v;
      // (r, c)를 정하면 (r-1, c)의 네 이웃이 모두 정해진다
      if (r > 0 && !clueOk(r - 1, c)) continue;
      dfs(i + 1);
    }
    inside[i] = 0;
  };
  dfs(0);
  return found;
}

describe("generate", () => {
  for (const size of SIZES) {
    it(`${size}x${size}: 시드 100개가 모두 유일해이고 판정기를 통과한다`, () => {
      let maxMs = 0;
      for (const seed of SEEDS) {
        const t = performance.now();
        const puzzle = generate(size, seed);
        maxMs = Math.max(maxMs, performance.now() - t);
        expect(puzzle.size).toBe(size);
        expect(puzzle.seed).toBe(seed);
        expect(puzzle.clues).toHaveLength(size * size);
        // 예산 없는 해 세기. "v가 아님" 경로는 쓰지 않는다
        const r = solve(puzzle, { limit: 2 });
        expect(r.exhausted).toBe(false);
        expect(r.count).toBe(1);
        const marks = new Array(2 * size * (size + 1)).fill(0);
        for (const e of r.solution!) marks[e] = 1;
        expect(isSolved(puzzle, marks)).toBe(true);
        const shown = puzzle.clues.filter((v) => v !== null).length;
        expect(shown).toBeGreaterThan(0);
        expect(shown / (size * size)).toBeLessThanOrEqual(0.5);
      }
      // 모바일은 더 느리므로 Node에서는 넉넉히 잡는다
      expect(maxMs).toBeLessThan(2000);
    }, 120_000);

    it(`${size}x${size}: 같은 시드는 같은 판, 다른 시드는 다른 판`, () => {
      const a = SEEDS.slice(0, 30).map((s) => JSON.stringify(generate(size, s)));
      const b = SEEDS.slice(0, 30).map((s) => JSON.stringify(generate(size, s)));
      expect(a).toEqual(b);
      expect(new Set(a).size).toBe(a.length);
    });

    it(`${size}x${size}: 영역과 여집합(바깥 포함)이 각각 이어져 있다`, () => {
      for (const seed of SEEDS) {
        const { region } = generateDetailed(size, seed);
        const cells = region.reduce((s, v) => s + v, 0);
        expect(cells).toBeGreaterThanOrEqual(2);
        expect(connected(region, size, 1, false)).toBe(true);
        expect(connected(region, size, 0, true)).toBe(true);
      }
    });
  }

  it("5x5 독립 검증기: 안/밖 배치가 정확히 하나다", () => {
    for (let i = 0; i < 24; i++) {
      const puzzle = generate(5, `indep-${i}`);
      expect(countByEnumeration(puzzle)).toBe(1);
    }
  }, 120_000);

  it("독립 검증기와 풀이기는 해가 여러 개인 판에서도 같은 수를 센다", () => {
    const clues = FIXED_PUZZLE.clues.map((v, i) => (i % 2 === 0 ? v : null)) as Puzzle["clues"];
    const puzzle: Puzzle = { ...FIXED_PUZZLE, clues };
    const byEnum = countByEnumeration(puzzle);
    expect(byEnum).toBeGreaterThan(1);
    expect(solve(puzzle, { limit: 100000 }).count).toBe(byEnum);
  }, 120_000);

  it("골든: 고정 시드의 판이 바뀌지 않는다", () => {
    expect(GENERATOR_VERSION).toBe(1);
    expect(generate(5, "golden-5").clues).toEqual([null,1,null,null,null,3,1,null,null,null,null,2,null,1,null,2,0,2,1,2,null,2,3,null,null]);
    expect(generate(7, "golden-7").clues).toEqual([2,2,null,2,2,null,null,2,1,null,null,null,null,1,null,0,2,3,null,null,1,3,null,null,null,null,null,0,3,0,null,null,1,null,null,2,null,1,3,1,null,null,1,null,null,2,null,1,0]);
    expect(generate(10, "golden-10").clues).toEqual([null,null,0,null,null,null,null,null,3,2,null,null,null,3,null,null,3,2,1,null,null,null,1,2,1,1,1,2,null,2,1,3,3,null,null,null,2,null,null,null,1,2,2,null,null,null,2,null,1,null,null,2,2,null,null,2,2,null,1,null,1,null,2,null,2,null,3,null,0,2,null,2,3,1,1,2,null,null,null,2,null,2,null,1,null,null,3,null,null,3,3,1,2,null,3,2,3,null,null,null]);
  });
});

describe("허용 표", () => {
  const mask = (...bits: number[]) => bits.reduce((m, b) => m | (1 << b), 0);
  // 비트: 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW
  it("직교 이웃이 영역이 아니면 허용하지 않는다", () => {
    expect(ALLOWED_TABLE[0]).toBe(0);
    expect(ALLOWED_TABLE[mask(1, 3, 5, 7)]).toBe(0);
  });
  it("한쪽에만 붙는 칸은 허용한다", () => {
    expect(ALLOWED_TABLE[mask(0)]).toBe(1);
    expect(ALLOWED_TABLE[mask(0, 1, 2)]).toBe(1);
  });
  it("맞은편 이웃만 있으면(바깥이 둘로 갈림) 허용하지 않는다", () => {
    expect(ALLOWED_TABLE[mask(0, 4)]).toBe(0);
  });
  it("직교 이웃을 포함하지 않는 대각선 구간은 세지 않는다", () => {
    // N과 E가 영역이고 NE만 비어 있어도 NE 칸은 이 칸과 무관하게 바깥과 이어져 있다
    expect(ALLOWED_TABLE[mask(0, 2)]).toBe(1);
    expect(ALLOWED_TABLE[mask(0, 1, 2)]).toBe(1);
  });
  it("7번에서 0번으로 넘어가는 이음매를 같은 구간으로 본다", () => {
    // 영역: E. 나머지(NW, N, NE...)가 이음매를 지나 하나로 이어진다
    expect(ALLOWED_TABLE[mask(2)]).toBe(1);
    expect(ALLOWED_TABLE[mask(2, 3, 4, 5, 6)]).toBe(1);
  });
  it("전부 영역이면 허용하지 않는다", () => {
    expect(ALLOWED_TABLE[255]).toBe(0);
  });
});
