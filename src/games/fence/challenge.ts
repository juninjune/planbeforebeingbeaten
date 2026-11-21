export interface Challenge {
  ms: number;
  hints: number;
}

const MAX_MS = 86_400_000;
const MAX_HINTS = 999;

/** 10진 숫자로만 이뤄진 문자열이면 정수로, 아니면 null */
function digitsToInt(s: string | undefined): number | null {
  if (s === undefined || !/^[0-9]{1,10}$/.test(s)) return null;
  return Number(s);
}

/** ct는 1 이상 86400000 이하의 정수, ch는 0 이상 999 이하의 정수(없으면 0). 그 외는 null */
export function parseChallenge(params: Record<string, string>): Challenge | null {
  const ms = digitsToInt(params.ct);
  if (ms === null || ms < 1 || ms > MAX_MS) return null;
  let hints = 0;
  if (params.ch !== undefined) {
    const h = digitsToInt(params.ch);
    if (h === null || h > MAX_HINTS) return null;
    hints = h;
  }
  return { ms, hints };
}

/** 도전장 주소의 쿼리. 오늘의 판은 호출하는 쪽이 seed에 dailySeed를 넘긴다(daily=1은 넣지 않는다) */
export function buildShareParams(input: { size: number; seed: string; ms: number; hints: number }): Record<string, string> {
  const ms = Math.min(MAX_MS, Math.max(1, Math.round(input.ms)));
  const hints = Math.min(MAX_HINTS, Math.max(0, Math.round(input.hints)));
  return { size: String(input.size), seed: input.seed, ct: String(ms), ch: String(hints) };
}

export type Outcome = "win" | "lose" | "tie" | "assisted";

/** 내 힌트가 도전자보다 많으면 assisted. 아니면 시간 비교. diffMs는 시간 차이의 절댓값 */
export function judgeChallenge(
  challenge: Challenge,
  mine: { ms: number; hints: number },
): { outcome: Outcome; diffMs: number } {
  if (mine.hints > challenge.hints) return { outcome: "assisted", diffMs: 0 };
  const diff = mine.ms - challenge.ms;
  if (diff < 0) return { outcome: "win", diffMs: -diff };
  if (diff > 0) return { outcome: "lose", diffMs: diff };
  return { outcome: "tie", diffMs: 0 };
}
