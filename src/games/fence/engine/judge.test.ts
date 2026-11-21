import { describe, expect, it } from "vitest";
import { cellEdges, edgeCount, hEdge, vEdge, type EdgeMark, type Puzzle } from "./grid";
import { FIXED_PUZZLE, FIXED_SOLUTION } from "./fixtures";
import { isSolved } from "./judge";

function marksOf(size: number, lines: number[], xs: number[] = []): EdgeMark[] {
  const m = new Array<EdgeMark>(edgeCount(size)).fill(0);
  for (const e of lines) m[e] = 1;
  for (const e of xs) m[e] = 2;
  return m;
}

const noClues: Puzzle = { size: 5, seed: "t", clues: new Array(25).fill(null) };

describe("isSolved", () => {
  it("고정 퍼즐의 정답은 참", () => {
    expect(isSolved(FIXED_PUZZLE, marksOf(5, FIXED_SOLUTION))).toBe(true);
  });

  it("고리가 하나 덜 닫힌 상태는 거짓", () => {
    expect(isSolved(FIXED_PUZZLE, marksOf(5, FIXED_SOLUTION.slice(1)))).toBe(false);
  });

  it("닫힌 고리지만 숫자가 맞지 않으면 거짓", () => {
    const ring = cellEdges(5, 0, 0);
    expect(isSolved(FIXED_PUZZLE, marksOf(5, [...ring]))).toBe(false);
  });

  it("고리가 2개이면 거짓", () => {
    const a = cellEdges(5, 0, 0);
    const b = cellEdges(5, 3, 3);
    expect(isSolved(noClues, marksOf(5, [...a, ...b]))).toBe(false);
  });

  it("갈래(차수 3)가 있으면 거짓", () => {
    const ring = cellEdges(5, 1, 1);
    // 고리의 한 점에서 바깥으로 선 하나를 더 뻗는다
    expect(isSolved(noClues, marksOf(5, [...ring, hEdge(5, 1, 0)]))).toBe(false);
  });

  it("X 표시는 선으로 보지 않는다", () => {
    const sol = FIXED_SOLUTION;
    const extra = vEdge(5, 4, 0);
    expect(sol.includes(extra)).toBe(false);
    expect(isSolved(FIXED_PUZZLE, marksOf(5, sol, [extra]))).toBe(true);
    // 정답 변 하나를 X로 바꾸면 거짓
    expect(isSolved(FIXED_PUZZLE, marksOf(5, sol.slice(1), [sol[0]!]))).toBe(false);
  });

  it("선이 없으면 거짓", () => {
    expect(isSolved(noClues, marksOf(5, []))).toBe(false);
  });

  it("숫자 없는 판에서 단순 고리는 참", () => {
    expect(isSolved(noClues, marksOf(5, cellEdges(5, 2, 2)))).toBe(true);
  });
});
