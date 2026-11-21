---
description: "울타리 치기 1인 플레이 작업 목록"
---

# Tasks: 울타리 치기 1인 플레이

**Input**: Design documents from `/specs/001-fence-solo-play/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 헌법 원칙 IV에 따라 엔진 테스트는 필수다. UI는 Aside e2e로 검증한다.

**Organization**: 사용자 스토리 순서대로 진행한다. 각 Phase의 Checkpoint에서 `pnpm test`와 `e2e/run.sh`가 통과해야 다음으로 간다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 서로 다른 파일이라 병렬로 할 수 있음
- **[Story]**: 해당 사용자 스토리

## Phase 1: Setup

- [x] T001 Vite + React 19 + TypeScript(strict) 프로젝트를 저장소 루트에 구성한다: `package.json`(scripts: `dev`, `build`, `test`, `typecheck`), `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `.gitignore`
- [x] T002 Vitest를 설정하고 `pnpm test`가 `src/**/*.test.ts`를 한 번 실행하고 끝나게 한다

---

## Phase 2: Foundational

- [x] T003 [P] `src/core/game.ts`에 `GameDefinition`, `GameScreenProps` 타입을 만든다 (contracts/game-plugin.md)
- [x] T004 [P] `src/app/route.ts`에 해시 주소 해석과 `navigate`를 만든다
- [x] T005 `src/games/index.ts` 레지스트리, `src/app/App.tsx` 셸, `src/app/Lobby.tsx` 로비, 하단 고지를 만든다 (ui-test-hooks.md의 `lobby`, `game-<id>`, `disclaimer`)

**Checkpoint**: `pnpm dev`로 로비가 뜬다.

---

## Phase 3: User Story 1 - 한 판을 끝까지 푼다 (Priority: P1) 🎯 MVP

**Goal**: 고정 5x5 퍼즐을 로비에서 열어 끝까지 풀면 완성 화면과 기록 시간이 나온다.

**Independent Test**: `e2e/run.sh fixed`가 통과한다.

### Tests for User Story 1

- [x] T006 [P] [US1] `src/games/fence/engine/judge.test.ts`: 정답, 미완성 고리, 숫자 불일치, 고리 2개, 갈래, X 표시 무시, 선 없음
- [x] T007 [P] [US1] `src/games/fence/engine/state.test.ts`: cycle 순환, 완성 시 `solved`, 완성 후 행동 무시, 범위 밖 변 무시, 불변성

### Implementation for User Story 1

- [x] T008 [P] [US1] `src/games/fence/engine/grid.ts`: 변·점·칸 번호 계산 (data-model.md)
- [x] T009 [US1] `src/games/fence/engine/judge.ts`: `isSolved`
- [x] T010 [US1] `src/games/fence/engine/state.ts`: `initialState`, `reduce` (cycle만 먼저, undo와 clear는 Phase 6)
- [x] T011 [US1] `src/games/fence/engine/fixtures.ts`: 유일해가 손으로 확인된 고정 5x5 퍼즐과 그 정답
- [x] T012 [US1] `src/games/fence/ui/Board.tsx`: SVG 보드, 숫자, 선, X 표시, 마름모 터치 영역 (`data-edge`, `data-mark`)
- [x] T013 [US1] `src/games/fence/ui/FenceScreen.tsx`: 리듀서 연결, 타이머, 완성 화면(기록 시간, 새 판, 로비로), 개발 전용 `window.__fence`
- [x] T014 [US1] `src/games/fence/index.ts`에 `GameDefinition`을 만들고 레지스트리에 등록한다
- [x] T015 [US1] `e2e/fence.e2e.js`, `e2e/run.sh`: 390x844에서 로비 진입, 고리 미완성 확인, 숫자 불일치 확인, 정답 완성, 기록 시간 확인, 스크린샷 저장

**Checkpoint**: `pnpm test` 통과, `e2e/run.sh fixed`가 `E2E PASS`.

---

## Phase 4: User Story 2 - 새로운 판과 같은 판 다시 열기 (Priority: P2)

**Goal**: 시드로 판을 생성하고, 모든 판이 유일해이며, 같은 주소는 같은 판을 연다.

**Independent Test**: 생성기 테스트 통과, 임의 시드 주소로 `e2e/run.sh`가 통과한다.

### Tests for User Story 2

- [x] T016 [P] [US2] `src/games/fence/engine/solver.test.ts`: 고정 퍼즐 해 1개, 숫자를 지운 판 해 2개 이상, 모순 판 해 0개, 노드 상한
- [x] T017 [P] [US2] `src/games/fence/engine/generator.test.ts`: 크기별 시드 100개 유일해, 같은 시드 재현, 다른 시드 다른 판, 숫자 비율, 10x10 생성 시간

### Implementation for User Story 2

- [x] T018 [P] [US2] `src/core/rng.ts`: 문자열 시드 해시와 mulberry32
- [x] T019 [US2] `src/games/fence/engine/solver.ts`: 제약 전파와 탐색으로 해 세기 (research.md 3절)
- [x] T020 [US2] `src/games/fence/engine/generator.ts`: 영역 성장 고리, 숫자 계산, 유일해 유지하며 숫자 지우기 (research.md 1절부터 3절)
- [x] T021 [US2] `FenceScreen.tsx`: 주소의 `seed`로 판 생성, `seed`가 없으면 새 시드를 주소에 채움, 새 판 버튼은 새 시드로 이동, `seed=fixed`는 고정 퍼즐 유지

**Checkpoint**: `pnpm test` 통과, `e2e/run.sh`가 생성된 판으로 `E2E PASS`.

---

## Phase 5: User Story 3 - 판 크기 선택 (Priority: P3)

**Goal**: 5x5, 7x7, 10x10을 고를 수 있고 기본은 7x7이다.

**Independent Test**: `e2e/run.sh`가 세 크기 모두 통과하고 스크린샷 6장이 생긴다.

- [x] T022 [US3] `FenceScreen.tsx`: 크기 선택(`size-5`, `size-7`, `size-10`), 주소 반영, 잘못된 값은 7
- [x] T023 [US3] `Board.tsx`와 스타일: 390x844에서 10x10 판 전체가 가로 스크롤 없이 보이게 한다
- [x] T024 [US3] `e2e/fence.e2e.js`, `e2e/run.sh`: 세 크기 반복, 크기별 시작·완성 스크린샷을 `e2e/screenshots/`에 저장

**Checkpoint**: `e2e/run.sh`가 세 크기 모두 `E2E PASS`.

---

## Phase 6: User Story 4 - 되돌리기, 지우기, 연출 (Priority: P4)

**Goal**: 실수를 고칠 수 있고, 화면이 어두운 두뇌 서바이벌 톤이다.

**Independent Test**: 리듀서 테스트 통과, 연출 뒤에도 `e2e/run.sh` 통과.

- [x] T025 [P] [US4] `state.test.ts`에 undo, clear 테스트를 추가하고 `state.ts`에 구현한다
- [x] T026 [US4] `FenceScreen.tsx`에 되돌리기, 전체 지우기 버튼을 단다 (`undo`, `clear`)
- [x] T027 [US4] `src/app/theme.css`, `src/games/fence/ui/fence.css`: 어두운 톤 연출. 자체 제작 CSS와 SVG만 사용하고 ui-test-hooks.md의 속성은 유지한다
- [x] T028 [US4] e2e에 되돌리기와 전체 지우기 확인을 추가한다

**Checkpoint**: `pnpm test` 통과, `e2e/run.sh` 세 크기 `E2E PASS`.

---

## Phase 7: Polish

- [x] T029 `pnpm build`와 `pnpm typecheck`가 통과하고, 빌드 결과물에 `__fence`가 없는지 확인한다
- [x] T030 화면, 문구, 메타데이터에 프로그램명, 출연자명, 타사 상표가 없는지 검색으로 확인한다
- [x] T031 quickstart.md의 절차를 처음부터 따라 해 확인한다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 순서로 진행한다.
- 각 Phase의 Checkpoint가 통과하지 않으면 다음 Phase로 가지 않는다.
- Phase 3이 끝나면 고정 퍼즐로 플레이할 수 있는 최소 버전이 된다.

---

## Phase 8: User Story 5 - 풀이 도우미 (Priority: P5)

**Goal**: 처음 온 사람이 규칙을 알고, 막혔을 때 힌트로 한 걸음 나아갈 수 있다.

**Independent Test**: 리듀서 테스트 통과, e2e에서 규칙 안내와 힌트 확인 뒤 기존 흐름이 그대로 통과한다.

- [x] T032 [US5] `state.ts`에 `{ type: "set", edge, mark }` 행동을 추가하고 테스트한다 (기록에 남고 판정 갱신)
- [x] T033 [US5] `src/games/fence/engine/hint.ts`: 정답과 현재 표시를 받아 다음 힌트(고칠 변과 값)를 고르는 순수 함수와 테스트
- [x] T034 [US5] `FenceScreen.tsx`: 힌트 버튼(`hint`), 힌트로 바뀐 변 강조, 사용 횟수 표시(`hint-count`), 완성 화면에 힌트 횟수
- [x] T035 [US5] `src/games/fence/ui/Rules.tsx`: 규칙 안내 시트(`rules`, `rules-open`, `rules-close`). 첫 방문 때 자동으로 열리고 닫으면 타이머가 시작된다
- [x] T036 [US5] e2e에 규칙 안내와 힌트 확인을 추가한다

**Checkpoint**: `pnpm test` 통과, `e2e/run.sh` 세 크기 `E2E PASS`.
