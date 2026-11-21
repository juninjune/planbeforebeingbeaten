import { describe, expect, it } from "vitest";
import { FIXED_PUZZLE, FIXED_SOLUTION } from "./fixtures";
import type { Puzzle } from "./grid";
import { isSolved } from "./judge";
import { existsSolutionWithMasks, masksOf, solve } from "./solver";

describe("solve", () => {
  it("고정 퍼즐은 해가 1개이고 정답과 같다", () => {
    const r = solve(FIXED_PUZZLE, { limit: 2 });
    expect(r.count).toBe(1);
    expect(r.exhausted).toBe(false);
    expect(r.solution).toEqual(FIXED_SOLUTION);
  });

  it("숫자를 많이 지운 판은 해가 2개 이상이다", () => {
    const clues = FIXED_PUZZLE.clues.map((v, i) => (i === 24 ? v : null)) as Puzzle["clues"];
    const r = solve({ ...FIXED_PUZZLE, clues }, { limit: 2 });
    expect(r.count).toBe(2);
    expect(r.solution).not.toBeNull();
  });

  it("limit에서 멈춘다", () => {
    const empty: Puzzle = { size: 5, seed: "t", clues: new Array(25).fill(null) };
    expect(solve(empty, { limit: 3 }).count).toBe(3);
  });

  it("모순 판은 해가 0개다", () => {
    const clues = FIXED_PUZZLE.clues.slice() as Puzzle["clues"];
    clues[24] = 0;
    clues[23] = 3;
    const r = solve({ ...FIXED_PUZZLE, clues }, { limit: 2 });
    expect(r.count).toBe(0);
    expect(r.solution).toBeNull();
    expect(r.exhausted).toBe(false);
  });

  it("예산을 넘으면 exhausted이고 해 없음과 구분된다", () => {
    const empty: Puzzle = { size: 7, seed: "t", clues: new Array(49).fill(null) };
    const r = solve(empty, { limit: 2, maxNodes: 5 });
    expect(r.exhausted).toBe(true);
    expect(existsSolutionWithMasks(7, masksOf(empty), 5)).toBe("budget");
  });

  it("해는 판정기도 통과한다", () => {
    const r = solve(FIXED_PUZZLE);
    const marks = new Array(60).fill(0);
    for (const e of r.solution!) marks[e] = 1;
    expect(isSolved(FIXED_PUZZLE, marks)).toBe(true);
  });
});

describe("existsSolutionWithMasks", () => {
  it("숫자 하나를 뺀 마스크로 다른 해 유무를 가른다", () => {
    const masks = masksOf(FIXED_PUZZLE);
    // 모든 숫자가 있는 유일해 판에서 어느 칸도 다른 값을 허용하는 해가 없다
    for (let c = 0; c < 25; c++) {
      const trial = masks.slice();
      trial[c] = 0b11111 & ~masks[c]!;
      expect(existsSolutionWithMasks(5, trial, 20000)).toBe("none");
    }
    // 마스크 전체를 열면 해가 있다
    const open = masks.map(() => 0b11111);
    expect(existsSolutionWithMasks(5, open, 20000)).toBe("found");
  });
});
