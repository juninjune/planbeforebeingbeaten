# Implementation Plan: 울타리 치기 1인 플레이

**Branch**: `001-fence-solo-play` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fence-solo-play/spec.md`

## Summary

로비에서 울타리 치기를 골라 한 판을 풀면 완성 화면과 기록 시간이 나오는 정적 웹 앱을 만든다.
규칙 엔진은 UI와 분리된 순수 TypeScript 모듈이고, 판은 시드로 결정적으로 생성하며 풀이기로
유일해를 보장한다. 보드는 SVG로 그리고, 검증은 엔진 단위 테스트와 Aside 브라우저 e2e로 한다.
고정 퍼즐로 끝까지 풀리는 최소 버전을 먼저 만들고, 생성기, 판 크기, 연출 순으로 얹는다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 22 이상
**Primary Dependencies**: Vite, React 19. 그 외 런타임 의존성 없음(라우터, 상태 라이브러리 미사용)
**Storage**: 없음 (풀이 상태와 기록을 저장하지 않음)
**Testing**: Vitest (엔진 단위 테스트), Aside 브라우저 `aside repl` 스크립트 (e2e)
**Target Platform**: 최신 모바일·데스크톱 브라우저, 정적 SPA
**Project Type**: 단일 프런트엔드 웹 앱
**Performance Goals**: 10x10 판 생성 2초 이내, 탭 반응 즉시(한 프레임)
**Constraints**: 390x844 세로 화면에서 가로 스크롤 없이 10x10 판 전체 표시, 서버 없음
**Scale/Scope**: 화면 2개(로비, 게임), 게임 1개, 판 크기 3종

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | 결과 |
|---|---|---|
| I. 저작권·상표 준수 | 표시명은 일반명사 "울타리 치기". 프로그램명·출연자·타사 상표를 코드, 문구, 메타데이터에 쓰지 않음. 그래픽은 CSS와 SVG로 자체 제작. 하단 고지 표시. | 통과 |
| II. 게임은 플러그인 | `src/games/fence/engine`은 React, DOM, 시계, 전역 난수에 의존하지 않음. 게임은 `GameDefinition`으로 레지스트리에 등록. | 통과 |
| III. 작동 확인 우선 | 1단계가 고정 퍼즐 최소 버전과 e2e 통과. 멀티플레이, 계정, 랭킹 없음. 시드 생성으로 같은 판 재현 가능. | 통과 |
| IV. 규칙 엔진 테스트 필수 | 판정, 리듀서, 생성기 유일해, 시드 재현성을 Vitest로 검증. UI는 Aside e2e로 검증. | 통과 |
| V. 모바일 우선·간편 접속 | 가입 없음. 기본 7x7. 10x10은 옵션. 변의 터치 영역을 마름모로 잡아 빈틈 없이 탭 가능. | 통과 |

설계 후 재점검: 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/001-fence-solo-play/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── game-plugin.md      # 게임 등록 인터페이스
│   ├── fence-engine.md     # 엔진 공개 함수
│   └── ui-test-hooks.md    # e2e가 의존하는 주소, DOM 속성, 개발 전용 훅
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── main.tsx
├── app/                    # 셸: 주소 해석, 로비, 고지, 공통 스타일
│   ├── App.tsx
│   ├── Lobby.tsx
│   ├── route.ts
│   └── theme.css
├── core/                   # 게임 공통
│   ├── game.ts             # GameDefinition 타입
│   └── rng.ts              # 시드 PRNG
└── games/
    ├── index.ts            # 레지스트리 (게임 추가 시 한 줄 추가)
    └── fence/
        ├── index.ts        # GameDefinition 내보내기
        ├── engine/         # 순수 규칙 엔진
        │   ├── grid.ts     # 변·점·칸 인덱스 계산
        │   ├── judge.ts    # 정답 판정
        │   ├── state.ts    # 상태, 행동, 리듀서
        │   ├── solver.ts   # 해 개수 세기
        │   ├── generator.ts# 시드 기반 생성
        │   ├── fixtures.ts # 고정 퍼즐
        │   └── *.test.ts
        └── ui/
            ├── FenceScreen.tsx
            ├── Board.tsx
            └── fence.css

e2e/
├── fence.e2e.js            # aside repl용 스크립트
├── run.sh                  # 개발 서버 확인 후 e2e 실행
└── screenshots/
```

**Structure Decision**: 단일 프런트엔드 프로젝트. 게임마다 `src/games/<id>/` 아래에 `engine`과 `ui`를
나누고, 엔진 테스트는 엔진 옆에 둔다. 새 게임은 폴더를 추가하고 `src/games/index.ts`에 한 줄을
더하면 된다.

## 구현 단계

각 단계가 끝나면 `pnpm test`와 `e2e/run.sh`가 통과해야 다음 단계로 간다.

1. **최소 버전**: 프로젝트 뼈대, 레지스트리와 로비, 고정 5x5 퍼즐, 판정, 리듀서, 꾸밈 없는 SVG 보드, 타이머, 완성 화면, 개발 전용 정답 훅, e2e 스크립트(정답 풀이와 오답 확인).
2. **생성기**: 시드 PRNG, 풀이기, 생성기, 주소의 시드로 판 재현, 유일해와 재현성 테스트.
3. **판 크기**: 5x5, 7x7, 10x10 선택, 주소 반영, e2e를 세 크기로 확장, 스크린샷.
4. **다듬기**: 되돌리기, 전체 지우기, 어두운 톤 연출, e2e 재확인.

## Complexity Tracking

위반 없음.
