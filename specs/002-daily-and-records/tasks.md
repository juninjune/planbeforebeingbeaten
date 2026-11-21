# Tasks: 오늘의 판과 내 기록

**Input**: `/specs/002-daily-and-records/` 의 spec.md, plan.md

- [x] T001 [US2] `src/games/fence/records.ts`와 `records.test.ts`: 기록 갱신 순수 함수와 저장소 래퍼
- [x] T002 [US1] `src/games/fence/engine/daily.ts`와 `daily.test.ts`: 한국 시간 날짜, 시드, 같은 날 같은 판, 30일 서로 다른 판
- [x] T003 [US1] `FenceScreen.tsx`: `daily=1` 주소, 오늘의 판 전환, 날짜 표시, 힌트 숨김, 이미 푼 판 안내
- [x] T004 [US2] `FenceScreen.tsx`: 완성 시 기록 저장, 최고 기록과 푼 판 수 표시, 갱신 표시
- [x] T005 [US1] `src/core/game.ts`, `Lobby.tsx`, `src/games/fence/ui/DailyEntry.tsx`: 로비의 오늘의 판 진입과 연속 일수
- [x] T006 `e2e/daily.e2e.js`, `e2e/run.sh`: 오늘의 판과 기록 시나리오 추가, 기존 6개 유지
- [x] T007 `pnpm typecheck`, `pnpm test`, `pnpm build`, `e2e/run.sh` 전체 통과
