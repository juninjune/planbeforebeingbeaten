const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;
}

/** 한국 시간(UTC+9) 기준 날짜 "YYYY-MM-DD". 기기의 시간대와 무관하다 */
export function kstDateKey(epochMs: number): string {
  return formatUtcDate(epochMs + KST_OFFSET_MS);
}

/** "YYYY-MM-DD"에서 days일 뒤(음수면 앞) 날짜 */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return formatUtcDate(Date.UTC(y, m - 1, d) + days * DAY_MS);
}

export function prevDateKey(dateKey: string): string {
  return shiftDateKey(dateKey, -1);
}

export function dailySeed(dateKey: string): string {
  return `daily-${dateKey}`;
}
