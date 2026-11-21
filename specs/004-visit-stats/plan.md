# Implementation Plan: 방문·완주 통계

**Branch**: `main` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

## Constitution Check

원칙 I부터 V까지 위반 없음. 집계 주소를 만드는 부분은 순수 함수로 두고 테스트한다. 엔진은 통계를
모른다. 통계 호출은 UI 계층에서만 한다.

## 설계

`src/core/analytics.ts`

```ts
interface Hit { path: string; title?: string; event?: boolean; referrer?: string; screenWidth?: number }
/** GoatCounter 집계 주소. 쿼리는 p, t, e, r, s, b, rnd */
function buildCountUrl(endpoint: string, hit: Hit, rnd: string): string;
/** 집계 여부. 배포 빌드이고 호스트가 puzzle.pinballz.kr 이며 skipgc가 아닐 때만 참 */
function isEnabled(env: { prod: boolean; hostname: string; skip: boolean }): boolean;
/** 화면 이동 집계. 절대 예외를 던지지 않는다 */
function trackView(path: string, title: string): void;
/** 이벤트 집계. 절대 예외를 던지지 않는다 */
function trackEvent(name: string): void;
```

- 집계 주소: `https://pinballz.goatcounter.com/count`.
- 전송: `navigator.sendBeacon(url)`을 쓰고, 없거나 실패하면 `new Image().src = url`. 전체를 try/catch로 감싼다.
- `b`는 `0`, `s`는 `screen.width`, `rnd`는 캐시 방지용 짧은 난수다.
- 화면 이동 경로: 로비는 `/`, 게임 화면은 `/fence`. 쿼리(크기, 시드, 도전 값)는 넣지 않는다. 셸이 경로가 바뀔 때 호출한다(크기나 시드만 바뀌는 이동은 화면 이동으로 세지 않는다).
- 이벤트 이름(판 크기 `<n>`은 5, 7, 10):
  - `fence/start/<n>`: 판이 열릴 때(규칙 시트가 자동으로 열린 경우에는 닫을 때)
  - `fence/complete/<n>`: 완성
  - `fence/hint/<n>`: 그 판의 첫 힌트
  - `fence/share/<n>`: 공유 화면 열기
  - `fence/daily-complete/<n>`: 오늘의 판을 그날 처음 완성
- 고정 퍼즐(`seed=fixed`)도 크기 5로 집계한다.

**화면과 e2e 사이의 약속**: `[data-testid="stats-note"]` 는 하단 고지의 통계 안내다.

**개발 전용 확인 수단**: 개발 빌드에서는 전송하지 않고 `window.__hits` 배열에 `{ path, event }`를 쌓는다. e2e가 이벤트 이름을 확인하는 데 쓴다. 배포 빌드에는 없다.
