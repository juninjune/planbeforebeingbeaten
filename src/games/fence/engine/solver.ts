import { cellEdges, edgeCount, edgeEnds, type Puzzle } from "./grid";

export interface SolveResult {
  /** 찾은 해의 수. limit에서 멈춘다 */
  count: number;
  /** 첫 번째 해의 선 변 번호 목록(오름차순). 해가 없으면 null */
  solution: number[] | null;
  /** 변 대입 횟수 상한에 걸려 탐색을 끝내지 못했으면 true */
  exhausted: boolean;
}

export type ExistsResult = "none" | "found" | "budget";

interface Topo {
  edges: number;
  points: number;
  cells: number;
  eu: Int32Array;
  ev: Int32Array;
  pointEdges: number[][];
  cellEdgeList: number[][];
  edgeCells: number[][];
}

const topoCache = new Map<number, Topo>();

function topology(size: number): Topo {
  const cached = topoCache.get(size);
  if (cached) return cached;
  const edges = edgeCount(size);
  const points = (size + 1) * (size + 1);
  const cells = size * size;
  const eu = new Int32Array(edges);
  const ev = new Int32Array(edges);
  const pointEdges: number[][] = Array.from({ length: points }, () => []);
  for (let e = 0; e < edges; e++) {
    const [a, b] = edgeEnds(size, e);
    eu[e] = a;
    ev[e] = b;
    pointEdges[a]!.push(e);
    pointEdges[b]!.push(e);
  }
  const cellEdgeList: number[][] = [];
  const edgeCells: number[][] = Array.from({ length: edges }, () => []);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const list = cellEdges(size, r, c);
      cellEdgeList.push(list);
      for (const e of list) edgeCells[e]!.push(r * size + c);
    }
  }
  const topo = { edges, points, cells, eu, ev, pointEdges, cellEdgeList, edgeCells };
  topoCache.set(size, topo);
  return topo;
}

const ALL = 0b11111;

/** 숫자 칸은 그 숫자만, 빈 칸은 0부터 4까지 모두 허용하는 비트마스크 */
export function masksOf(puzzle: Puzzle): number[] {
  return puzzle.clues.map((v) => (v === null ? ALL : 1 << v));
}

function run(size: number, masks: readonly number[], limit: number, maxNodes: number): SolveResult {
  const { edges, points, cells, eu, ev, pointEdges, cellEdgeList, edgeCells } = topology(size);
  // 0 미정, 1 선, 2 없음
  const st = new Int8Array(edges);
  // 열린 경로의 반대쪽 끝점. 경로 안쪽 점의 값은 쓰지 않는다
  const end = new Int32Array(points);
  for (let p = 0; p < points; p++) end[p] = p;

  const trailEdges: number[] = [];
  const trailEnds: number[] = [];
  const queue: number[] = [];
  let qh = 0;
  let nodes = 0;
  let aborted = false;
  let done = false;
  let count = 0;
  let solution: number[] | null = null;

  const lineDeg = (p: number): number => {
    let d = 0;
    for (const e of pointEdges[p]!) if (st[e] === 1) d++;
    return d;
  };

  // 고리가 닫힌 순간: 모든 점과 칸이 조건을 만족하면 해
  const onClosed = (): void => {
    for (let p = 0; p < points; p++) {
      const d = lineDeg(p);
      if (d !== 0 && d !== 2) return;
    }
    for (let c = 0; c < cells; c++) {
      let n = 0;
      for (const e of cellEdgeList[c]!) if (st[e] === 1) n++;
      if (((masks[c]! >> n) & 1) === 0) return;
    }
    count++;
    if (solution === null) {
      solution = [];
      for (let e = 0; e < edges; e++) if (st[e] === 1) solution.push(e);
    }
    if (count >= limit) done = true;
  };

  // false는 모순(또는 중단). 선을 놓아 고리가 닫히면 해 판정 뒤 항상 false
  const assign = (e: number, val: 1 | 2): boolean => {
    const cur = st[e]!;
    if (cur !== 0) return cur === val;
    if (++nodes > maxNodes) {
      aborted = true;
      return false;
    }
    if (val === 1) {
      const u = eu[e]!;
      const v = ev[e]!;
      if (lineDeg(u) >= 2 || lineDeg(v) >= 2) return false;
      st[e] = 1;
      trailEdges.push(e);
      if (end[u] === v) {
        onClosed();
        return false;
      }
      const a = end[u]!;
      const b = end[v]!;
      trailEnds.push(a, end[a]!, b, end[b]!);
      end[a] = b;
      end[b] = a;
    } else {
      st[e] = 2;
      trailEdges.push(e);
    }
    queue.push(e);
    return true;
  };

  const checkPoint = (p: number): boolean => {
    const pe = pointEdges[p]!;
    let l = 0;
    let u = 0;
    for (const e of pe) {
      if (st[e] === 1) l++;
      else if (st[e] === 0) u++;
    }
    if (l > 2) return false;
    if (l === 2) {
      if (u > 0) for (const e of pe) if (st[e] === 0 && !assign(e, 2)) return false;
    } else if (l === 1) {
      if (u === 0) return false;
      if (u === 1) for (const e of pe) if (st[e] === 0) return assign(e, 1);
    } else if (u === 1) {
      for (const e of pe) if (st[e] === 0) return assign(e, 2);
    }
    return true;
  };

  const checkCell = (c: number): boolean => {
    const ce = cellEdgeList[c]!;
    const m = masks[c]!;
    let l = 0;
    let u = 0;
    for (const e of ce) {
      if (st[e] === 1) l++;
      else if (st[e] === 0) u++;
    }
    let minF = -1;
    let maxF = -1;
    for (let k = l; k <= l + u; k++) {
      if ((m >> k) & 1) {
        if (minF < 0) minF = k;
        maxF = k;
      }
    }
    if (minF < 0) return false;
    if (u === 0) return true;
    if (maxF === l) {
      for (const e of ce) if (st[e] === 0 && !assign(e, 2)) return false;
    } else if (minF === l + u) {
      for (const e of ce) if (st[e] === 0 && !assign(e, 1)) return false;
    }
    return true;
  };

  const propagate = (): boolean => {
    while (qh < queue.length) {
      const e = queue[qh++]!;
      let ok = !done && !aborted && checkPoint(eu[e]!) && checkPoint(ev[e]!);
      if (ok) for (const c of edgeCells[e]!) if (!checkCell(c)) { ok = false; break; }
      if (!ok) {
        queue.length = 0;
        qh = 0;
        return false;
      }
    }
    queue.length = 0;
    qh = 0;
    return true;
  };

  const undo = (te: number, tn: number): void => {
    while (trailEdges.length > te) st[trailEdges.pop()!] = 0;
    while (trailEnds.length > tn) {
      const oldB = trailEnds.pop()!;
      const b = trailEnds.pop()!;
      const oldA = trailEnds.pop()!;
      const a = trailEnds.pop()!;
      end[b] = oldB;
      end[a] = oldA;
    }
  };

  const pickBranch = (): number => {
    // 열린 경로 끝점 중 미정 변이 가장 적은 곳
    let bestP = -1;
    let bestU = 99;
    for (let p = 0; p < points; p++) {
      if (lineDeg(p) !== 1) continue;
      let u = 0;
      for (const e of pointEdges[p]!) if (st[e] === 0) u++;
      if (u > 0 && u < bestU) {
        bestU = u;
        bestP = p;
      }
    }
    if (bestP >= 0) {
      let best = -1;
      for (const e of pointEdges[bestP]!) if (st[e] === 0 && (best < 0 || e < best)) best = e;
      return best;
    }
    // 숫자 3 또는 1인 칸의 미정 변, 없으면 번호가 가장 작은 미정 변
    for (let c = 0; c < cells; c++) {
      if (masks[c] !== 1 << 3 && masks[c] !== 1 << 1) continue;
      let best = -1;
      for (const e of cellEdgeList[c]!) if (st[e] === 0 && (best < 0 || e < best)) best = e;
      if (best >= 0) return best;
    }
    for (let e = 0; e < edges; e++) if (st[e] === 0) return e;
    return -1;
  };

  const search = (): void => {
    if (done || aborted) return;
    const e = pickBranch();
    if (e < 0) return;
    for (const val of [1, 2] as const) {
      const te = trailEdges.length;
      const tn = trailEnds.length;
      if (assign(e, val) && propagate()) search();
      queue.length = 0;
      qh = 0;
      undo(te, tn);
      if (done || aborted) return;
    }
  };

  let ok = true;
  for (let p = 0; p < points && ok; p++) ok = checkPoint(p);
  for (let c = 0; c < cells && ok; c++) ok = checkCell(c);
  if (ok) ok = propagate();
  if (ok && !done && !aborted) search();
  return { count, solution, exhausted: aborted };
}

/** 칸마다 허용 개수 마스크를 직접 주는 풀이. 생성기가 쓴다 */
export function solveMasks(
  size: number,
  masks: readonly number[],
  opts: { limit?: number; maxNodes?: number } = {},
): SolveResult {
  return run(size, masks, opts.limit ?? 2, opts.maxNodes ?? Infinity);
}

/** 마스크를 만족하는 해가 있는가. maxNodes는 변 대입 횟수 상한 */
export function existsSolutionWithMasks(size: number, masks: readonly number[], maxNodes: number): ExistsResult {
  const r = run(size, masks, 1, maxNodes);
  if (r.count > 0) return "found";
  return r.exhausted ? "budget" : "none";
}

/** maxNodes는 변 대입 횟수 상한이다 */
export function solve(puzzle: Puzzle, opts: { limit?: number; maxNodes?: number } = {}): SolveResult {
  return solveMasks(puzzle.size, masksOf(puzzle), opts);
}
