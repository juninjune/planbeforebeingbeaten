# Implementation Plan: 도전장 링크와 결과 카드

**Branch**: `main` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

## Constitution Check

원칙 I부터 V까지 위반 없음. 링크 해석과 결과 판정은 순수 함수로 두고 테스트한다. 카드는 캔버스에
자체 그래픽으로 그린다. 외부 라이브러리와 서버는 쓰지 않는다.

## 설계

**주소**: 기존 `#/fence?size=<n>&seed=<s>`에 `ct=<도전 기록 밀리초>`와 `ch=<힌트 횟수>`를 더한다.

- 오늘의 판을 공유할 때는 `daily=1` 대신 `seed=daily-YYYY-MM-DD`를 쓴다.
- 화면은 `seed`가 오늘의 `dailySeed`와 같으면 오늘의 판 모드로 연다(힌트 없음, 기록은 오늘의 판으로). 다르면 자유 판이다.

**순수 함수** `src/games/fence/challenge.ts`

```ts
interface Challenge { ms: number; hints: number }
/** ct는 1 이상 86400000 이하의 정수, ch는 0 이상 999 이하의 정수(없으면 0). 그 외는 null */
function parseChallenge(params: Record<string, string>): Challenge | null;
function buildShareParams(input: { size: number; seed: string; ms: number; hints: number }): Record<string, string>;
type Outcome = "win" | "lose" | "tie" | "assisted";
/** 내 힌트가 도전자보다 많으면 assisted. 아니면 시간 비교 */
function judgeChallenge(challenge: Challenge, mine: { ms: number; hints: number }): { outcome: Outcome; diffMs: number };
```

**카드** `src/games/fence/ui/card.ts`: `renderCard(data): HTMLCanvasElement`. 크기 1080x1350. 무대 조명
배경, 빛나는 고리, 판 크기, 기록, 힌트 횟수(없으면 "힌트 없음"), 오늘의 판이면 날짜, 서비스 이름
"두뇌 퍼즐"과 `puzzle.pinballz.kr`.

**공유 화면** `src/games/fence/ui/ShareSheet.tsx`: 완성 패널의 공유 버튼으로 연다.

**화면과 e2e 사이의 약속** (기존 것에 추가)

| 선택자 | 대상 |
|---|---|
| `[data-testid="share"]` | 완성 패널의 공유 버튼 |
| `[data-testid="share-sheet"]` | 공유 화면. `role="dialog"` |
| `[data-testid="result-card"]` | 카드 이미지(`img`, `src`는 PNG data URL) |
| `[data-testid="share-url"]` | 도전장 링크가 든 읽기 전용 입력 |
| `[data-testid="copy-link"]` | 링크 복사. 결과는 `data-copied="true\|manual"` |
| `[data-testid="save-card"]` | 이미지 저장 링크. `download` 속성과 PNG `href` |
| `[data-testid="share-native"]` | 기기 공유. `navigator.share`가 있을 때만 있다 |
| `[data-testid="share-close"]` | 닫기 |
| `[data-testid="challenge-banner"]` | 도전장으로 연 판의 도전 기록 표시. `data-ms`, `data-hints` |
| `[data-testid="challenge-result"]` | 완성 패널의 도전 결과. `data-outcome="win\|lose\|tie\|assisted"` |
