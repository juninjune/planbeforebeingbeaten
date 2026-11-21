/** 문자열 시드를 32비트 정수로 바꾼다(FNV-1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32. 32비트 부호 없는 정수를 돌려주는 생성기 */
export function mulberry32U32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

export interface Rng {
  /** 0 이상 n 미만의 정수 */
  int(n: number): number;
}

export function createRng(seed: string): Rng {
  const next = mulberry32U32(hashSeed(seed));
  return {
    // u * n은 2^53 아래라 정확하고, 2^32로 나누는 것도 정확하다
    int: (n) => Math.floor((next() * n) / 4294967296),
  };
}

/** 피셔-예이츠. 배열을 제자리에서 섞고 그대로 돌려준다 */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
