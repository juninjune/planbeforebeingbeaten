import { createRng, shuffle, type Rng } from "../../../core/rng";
import type { Puzzle, Size } from "./grid";
import { solveMasks, existsSolutionWithMasks } from "./solver";

/** 상수나 알고리즘을 바꾸면 시드와 판의 대응이 바뀐다. 올린 뒤 골든 테스트를 갱신한다 */
export const GENERATOR_VERSION = 1;

/** 전체 숫자 판의 유일해 확인에 쓰는 변 대입 횟수 상한 */
const FULL_CHECK_BUDGET = 200_000;
/** 숫자 하나를 지워도 되는지 확인하는 검사 1회의 변 대입 횟수 상한 */
const ERASE_CHECK_BUDGET = 20_000;
/** 고리 길이 / 영역 칸 수 최소 비율(x10) */
const MIN_PERIMETER_RATIO_X10 = 14;
const SHAPE_ATTEMPTS = 20;
const MAX_ATTEMPTS = 500;

// 8이웃 순서: N, NE, E, SE, S, SW, W, NW (비트 0부터 7)
const DR = [-1, -1, 0, 1, 1, 1, 0, -1];
const DC = [0, 1, 1, 1, 0, -1, -1, -1];

/**
 * 후보 칸의 8이웃 비트(영역이면 1)로 보는 허용 표.
 * (a) 직교 이웃 중 영역이 있고 (b) 영역이 아닌 이웃의 순환 구간 중 직교 이웃을 포함하는 것이 정확히 1개.
 */
export const ALLOWED_TABLE: Uint8Array = buildTable();

function buildTable(): Uint8Array {
  const table = new Uint8Array(256);
  for (let m = 0; m < 256; m++) {
    const bit = (i: number) => (m >> (i & 7)) & 1;
    const hasOrthRegion = bit(0) || bit(2) || bit(4) || bit(6);
    if (!hasOrthRegion || m === 255) continue;
    let start = 0;
    while (bit(start) === 0) start++;
    let runsWithOrth = 0;
    let inRun = false;
    let orth = false;
    for (let i = 1; i <= 8; i++) {
      const idx = (start + i) & 7;
      if (bit(idx) === 0) {
        inRun = true;
        if (idx % 2 === 0) orth = true;
      } else {
        if (inRun && orth) runsWithOrth++;
        inRun = false;
        orth = false;
      }
    }
    table[m] = runsWithOrth === 1 ? 1 : 0;
  }
  return table;
}

function neighborMask(region: Uint8Array, size: number, r: number, c: number): number {
  let m = 0;
  for (let i = 0; i < 8; i++) {
    const rr = r + DR[i]!;
    const cc = c + DC[i]!;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size && region[rr * size + cc]) m |= 1 << i;
  }
  return m;
}

/** 칸의 영역을 한 칸에서 키운다. 영역과 여집합(판 바깥 포함)이 항상 4방향으로 이어진다 */
function growRegion(size: number, rng: Rng): Uint8Array {
  const total = size * size;
  const target = Math.max(2, Math.floor((total * (50 + rng.int(6))) / 100));
  const region = new Uint8Array(total);
  region[rng.int(total)] = 1;
  let count = 1;
  const cand: number[] = [];
  const weight: number[] = [];
  while (count < target) {
    cand.length = 0;
    weight.length = 0;
    let sum = 0;
    for (let i = 0; i < total; i++) {
      if (region[i]) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      const m = neighborMask(region, size, r, c);
      if (!ALLOWED_TABLE[m]) continue;
      const k = (m & 1) + ((m >> 2) & 1) + ((m >> 4) & 1) + ((m >> 6) & 1);
      const w = k === 1 ? 8 : k === 2 ? 2 : 1;
      cand.push(i);
      weight.push(w);
      sum += w;
    }
    if (cand.length === 0) break;
    let pick = rng.int(sum);
    let chosen = cand[cand.length - 1]!;
    for (let j = 0; j < cand.length; j++) {
      pick -= weight[j]!;
      if (pick < 0) {
        chosen = cand[j]!;
        break;
      }
    }
    region[chosen] = 1;
    count++;
  }
  return region;
}

function inRegion(region: Uint8Array, size: number, r: number, c: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size && region[r * size + c] === 1;
}

/** 영역 경계의 길이 */
function perimeter(region: Uint8Array, size: number): number {
  let len = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = inRegion(region, size, r, c);
      if (v !== inRegion(region, size, r - 1, c)) len++;
      if (v !== inRegion(region, size, r, c - 1)) len++;
    }
  }
  for (let r = 0; r < size; r++) if (inRegion(region, size, r, size - 1)) len++;
  for (let c = 0; c < size; c++) if (inRegion(region, size, size - 1, c)) len++;
  return len;
}

function shapedRegion(size: number, rng: Rng): Uint8Array {
  let region = growRegion(size, rng);
  for (let attempt = 1; attempt < SHAPE_ATTEMPTS; attempt++) {
    let cells = 0;
    for (const v of region) cells += v;
    if (perimeter(region, size) * 10 >= MIN_PERIMETER_RATIO_X10 * cells) break;
    region = growRegion(size, rng);
  }
  return region;
}

function fullClues(region: Uint8Array, size: number): number[] {
  const clues: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = inRegion(region, size, r, c);
      let n = 0;
      if (v !== inRegion(region, size, r - 1, c)) n++;
      if (v !== inRegion(region, size, r + 1, c)) n++;
      if (v !== inRegion(region, size, r, c - 1)) n++;
      if (v !== inRegion(region, size, r, c + 1)) n++;
      clues.push(n);
    }
  }
  return clues;
}

export interface Generated {
  puzzle: Puzzle;
  /** 고리의 안쪽 칸(1) */
  region: Uint8Array;
}

/** 테스트용으로 영역도 함께 돌려준다 */
export function generateDetailed(size: Size, seed: string): Generated {
  const rng = createRng(`fence:${size}:${seed}`);
  const total = size * size;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const region = shapedRegion(size, rng);
    const full = fullClues(region, size);
    const masks = full.map((v) => 1 << v);
    const check = solveMasks(size, masks, { limit: 2, maxNodes: FULL_CHECK_BUDGET });
    if (check.count !== 1 || check.exhausted) continue;

    const clues: (number | null)[] = full.slice();
    let remaining = total;
    const order = shuffle(Array.from({ length: total }, (_, i) => i), rng);
    for (const c of order) {
      if (remaining * 2 <= total) break;
      const v = full[c]!;
      const trial = masks.slice();
      trial[c] = 0b11111 & ~(1 << v);
      if (existsSolutionWithMasks(size, trial, ERASE_CHECK_BUDGET) === "none") {
        masks[c] = 0b11111;
        clues[c] = null;
        remaining--;
      }
    }
    return { puzzle: { size, seed, clues: clues as Puzzle["clues"] }, region };
  }
  throw new Error(`generate failed: size=${size} seed=${seed}`);
}

/** 같은 size와 seed는 항상 같은 Puzzle을 돌려준다. 돌려준 퍼즐은 해가 정확히 하나다 */
export function generate(size: Size, seed: string): Puzzle {
  return generateDetailed(size, seed).puzzle;
}
