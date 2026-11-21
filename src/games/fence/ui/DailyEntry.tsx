import { useMemo } from "react";
import type { GameScreenProps } from "../../../core/game";
import { kstDateKey } from "../engine/daily";
import type { Size } from "../engine/grid";
import { currentStreak, loadRecords, type SizeKey } from "../records";

const SIZES: Size[] = [5, 7, 10];

/** 로비의 오늘의 판 진입 줄: 크기별 진입 버튼과 연속 일수 */
export function DailyEntry({ navigate }: { navigate: GameScreenProps["navigate"] }) {
  const { done, streak } = useMemo(() => {
    const records = loadRecords();
    const today = kstDateKey(Date.now());
    return { done: records.daily.done[today] ?? {}, streak: currentStreak(records, today) };
  }, []);

  return (
    <div className="daily-entry">
      <span className="daily-entry-title">오늘의 판</span>
      <div className="daily-entry-buttons">
        {SIZES.map((n) => {
          const isDone = done[String(n) as SizeKey] !== undefined;
          return (
            <button
              key={n}
              type="button"
              data-testid={`daily-${n}`}
              data-done={isDone ? "true" : "false"}
              onClick={() => navigate("/fence", { size: String(n), daily: "1" })}
            >
              {n}x{n}
              {isDone ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <span className="daily-entry-streak" data-testid="streak" data-streak={streak}>
        {streak > 0 ? `연속 ${streak}일` : "연속 기록 없음"}
      </span>
    </div>
  );
}
