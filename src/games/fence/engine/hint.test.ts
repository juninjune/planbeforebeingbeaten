import { describe, expect, it } from "vitest";
import { generate } from "./generator";
import { FIXED_PUZZLE, FIXED_SOLUTION } from "./fixtures";
import { edgeCount, edgeEnds, type EdgeMark } from "./grid";
import { nextHint } from "./hint";
import { isSolved } from "./judge";
import { solve } from "./solver";

const empty = () => new Array<EdgeMark>(edgeCount(5)).fill(0);

describe("nextHint", () => {
  it("1순위: 정답이 아닌 선 중 번호가 가장 작은 것을 지운다", () => {
    const marks = empty();
    const wrong = [2, 4, 5, 6].filter((e) => !FIXED_SOLUTION.includes(e));
    for (const e of wrong) marks[e] = 1;
    marks[FIXED_SOLUTION[0]!] = 2;
    expect(nextHint(5, marks, FIXED_SOLUTION)).toEqual({ edge: wrong[0], mark: 0 });
  });

  it("2순위: 정답인데 X인 변을 선으로 바꾼다", () => {
    const marks = empty();
    marks[FIXED_SOLUTION[3]!] = 2;
    marks[FIXED_SOLUTION[1]!] = 2;
    expect(nextHint(5, marks, FIXED_SOLUTION)).toEqual({ edge: FIXED_SOLUTION[1], mark: 1 });
  });

  it("3순위: 그어진 선의 끝점에 이어지는 정답 변을 우선한다", () => {
    const marks = empty();
    // 정답 변 하나만 그어 두면, 번호가 작은 변이 아니라 그 선에 이어지는 변이 나온다
    const start = FIXED_SOLUTION[10]!;
    marks[start] = 1;
    const hint = nextHint(5, marks, FIXED_SOLUTION)!;
    expect(hint.mark).toBe(1);
    expect(FIXED_SOLUTION.includes(hint.edge)).toBe(true);
    const ends = new Set(edgeEnds(5, start));
    expect(edgeEnds(5, hint.edge).some((p) => ends.has(p))).toBe(true);
  });

  it("3순위: 이어지는 변이 없으면 번호가 가장 작은 정답 변", () => {
    expect(nextHint(5, empty(), FIXED_SOLUTION)).toEqual({ edge: FIXED_SOLUTION[0], mark: 1 });
  });

  it("고칠 것이 없으면 null (정답 + 정답 아닌 X)", () => {
    const marks = empty();
    for (const e of FIXED_SOLUTION) marks[e] = 1;
    marks[4] = 2;
    expect(nextHint(5, marks, FIXED_SOLUTION)).toBeNull();
  });

  it("반복 적용하면 유한 번 안에 정답이 된다", () => {
    const cases = [FIXED_PUZZLE, ...[5, 7].flatMap((n) => ["h1", "h2", "h3"].map((s) => generate(n as 5 | 7, s)))];
    for (const puzzle of cases) {
      const solution = solve(puzzle).solution!;
      const marks = new Array<EdgeMark>(edgeCount(puzzle.size)).fill(0);
      // 틀린 선과 X를 일부러 섞어 둔다
      for (let e = 0; e < marks.length; e += 5) marks[e] = 1;
      for (let e = 2; e < marks.length; e += 7) if (marks[e] === 0) marks[e] = 2;
      let steps = 0;
      while (!isSolved(puzzle, marks)) {
        const h = nextHint(puzzle.size, marks, solution);
        expect(h).not.toBeNull();
        marks[h!.edge] = h!.mark;
        expect(++steps).toBeLessThanOrEqual(2 * marks.length);
      }
      expect(nextHint(puzzle.size, marks, solution)).toBeNull();
    }
  });
});
