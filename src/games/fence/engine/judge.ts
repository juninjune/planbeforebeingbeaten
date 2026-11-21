import { cellEdges, edgeCount, edgeEnds, type EdgeMark, type Puzzle } from "./grid";

/** marks에서 값이 1인 변만 선으로 본다 */
export function isSolved(puzzle: Puzzle, marks: readonly EdgeMark[]): boolean {
  const { size, clues } = puzzle;
  const lines: number[] = [];
  for (let e = 0; e < edgeCount(size); e++) {
    if (marks[e] === 1) lines.push(e);
  }
  // 1. 선이 하나 이상
  if (lines.length === 0) return false;

  // 2. 모든 점의 차수가 0 또는 2
  const pointCount = (size + 1) * (size + 1);
  const degree = new Array<number>(pointCount).fill(0);
  const parent = Array.from({ length: pointCount }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  for (const e of lines) {
    const [a, b] = edgeEnds(size, e);
    degree[a] = degree[a]! + 1;
    degree[b] = degree[b]! + 1;
    parent[find(a)] = find(b);
  }
  if (degree.some((d) => d !== 0 && d !== 2)) return false;

  // 3. 선들이 하나로 이어짐
  const root = find(edgeEnds(size, lines[0]!)[0]);
  if (lines.some((e) => find(edgeEnds(size, e)[0]) !== root)) return false;

  // 4. 숫자 칸의 선 개수 일치
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const clue = clues[r * size + c];
      if (clue === null || clue === undefined) continue;
      const count = cellEdges(size, r, c).filter((e) => marks[e] === 1).length;
      if (count !== clue) return false;
    }
  }
  return true;
}
