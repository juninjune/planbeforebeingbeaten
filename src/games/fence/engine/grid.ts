/** 한 변의 칸 수 */
export type Size = 5 | 7 | 10;

/** 0 빈 변, 1 선, 2 X 표시 */
export type EdgeMark = 0 | 1 | 2;

export interface Puzzle {
  size: Size;
  seed: string;
  /** 길이 size * size. null은 숫자 없음 */
  clues: (0 | 1 | 2 | 3 | null)[];
}

export function edgeCount(size: number): number {
  return 2 * size * (size + 1);
}

/** 가로 변: 점 (r, c)와 (r, c+1)을 잇는다 */
export function hEdge(size: number, r: number, c: number): number {
  return r * size + c;
}

/** 세로 변: 점 (r, c)와 (r+1, c)를 잇는다 */
export function vEdge(size: number, r: number, c: number): number {
  return size * (size + 1) + r * (size + 1) + c;
}

export function cellEdges(size: number, r: number, c: number): [number, number, number, number] {
  return [hEdge(size, r, c), hEdge(size, r + 1, c), vEdge(size, r, c), vEdge(size, r, c + 1)];
}

/** 변의 양 끝 점. 점 번호는 r * (size + 1) + c */
export function edgeEnds(size: number, edge: number): [number, number] {
  const hCount = size * (size + 1);
  if (edge < hCount) {
    const r = Math.floor(edge / size);
    const c = edge % size;
    const p = r * (size + 1) + c;
    return [p, p + 1];
  }
  const e = edge - hCount;
  const r = Math.floor(e / (size + 1));
  const c = e % (size + 1);
  const p = r * (size + 1) + c;
  return [p, p + size + 1];
}
