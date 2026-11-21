# Implementation Plan: 오늘의 판과 내 기록

**Branch**: `main` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

## Summary

오늘의 판은 한국 시간 날짜에서 시드를 만들어 기존 생성기로 만든다. 기록은 순수 함수로 갱신하고
브라우저 저장소에 넣는다. 서버는 없다.

## Constitution Check

원칙 I부터 V까지 위반 없음. 날짜 계산과 기록 갱신은 시계와 저장소에 의존하지 않는 순수 함수로 두고
(원칙 II, IV), 시계와 저장소 접근은 UI 쪽 얇은 래퍼에만 둔다.

## 설계

**오늘의 판** `src/games/fence/engine/daily.ts` (순수 함수)

- `kstDateKey(epochMs: number): string` 은 UTC+9 기준 `YYYY-MM-DD`를 돌려준다.
- `dailySeed(dateKey: string): string` 은 `daily-YYYY-MM-DD`를 돌려준다.
- `prevDateKey(dateKey: string): string` 은 하루 전 날짜를 돌려준다.
- 판은 `generate(size, dailySeed(dateKey))`로 만든다.

**내 기록** `src/games/fence/records.ts`

```ts
interface FenceRecords {
  v: 1;
  sizes: Record<"5" | "7" | "10", { best: number | null; solved: number }>;
  daily: {
    /** 날짜별, 크기별 첫 완성 기록. 최근 30일만 보관 */
    done: Record<string, Partial<Record<"5" | "7" | "10", { ms: number }>>>;
    streak: number;
    last: string | null;
  };
}
```

- `emptyRecords()`, `parseRecords(text)` (깨진 값은 빈 기록), `applyCompletion(records, { size, ms, hints, dailyKey })`, `currentStreak(records, todayKey)` 는 순수 함수다.
- `loadRecords()`, `saveRecords()` 는 저장소 키 `fence.records.v1`을 쓰고 예외를 삼킨다.

**주소**: `#/fence?size=7&daily=1`. `daily=1`이면 `seed`를 무시하고 화면을 연 시점의 날짜로 판을 정한다.

**등록 인터페이스**: `GameDefinition`에 선택 필드 `LobbyExtra?: ComponentType<{ navigate }>`를 추가해 로비 카드 아래에 오늘의 판 진입을 그린다.

**화면과 e2e 사이의 약속** (기존 것에 추가)

| 선택자 | 대상 |
|---|---|
| `[data-testid="daily-5"]`, `daily-7`, `daily-10` | 로비의 오늘의 판 진입. `data-done="true\|false"` |
| `[data-testid="streak"]` | 로비의 연속 일수. `data-streak="<숫자>"` |
| `[data-testid="daily-toggle"]` | 게임 화면의 오늘의 판 전환. `aria-pressed` |
| `[data-testid="daily-label"]` | 오늘의 판일 때만 있는 날짜 표시 |
| `[data-testid="daily-done-note"]` | 이미 푼 오늘의 판을 다시 열었을 때의 안내 |
| `[data-testid="fence-screen"]` | `data-daily="true\|false"` 추가 |
| `[data-testid="size-5"]` 등 | 오늘의 판 모드에서 `data-daily-done="true\|false"` |
| `[data-testid="best-time"]` | 현재 크기의 최고 기록. 없으면 `data-empty="true"` |
| `[data-testid="solved-count"]` | 현재 크기의 푼 판 수. `data-count="<숫자>"` |
| `[data-testid="new-best"]` | 완성 화면의 최고 기록 갱신 표시. 갱신했을 때만 있다 |
| `[data-testid="hint"]` | 오늘의 판에서는 DOM에 없다 |
