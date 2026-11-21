/** 밀리초를 분:초.소수두자리 로 바꾼다. 예: 7420 → "0:07.42" */
export function formatTime(ms: number): string {
  const cs = Math.floor(ms / 10);
  const minutes = Math.floor(cs / 6000);
  const seconds = Math.floor((cs % 6000) / 100);
  const rest = cs % 100;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(rest).padStart(2, "0")}`;
}
