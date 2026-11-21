# Contract: 화면과 e2e 사이의 약속

e2e 스크립트는 아래 주소, 속성, 개발 전용 훅에만 의존한다. 연출을 바꿔도 이 약속은 유지한다.

## 주소

- 로비: `#/`
- 울타리 치기: `#/fence?size=<5|7|10>&seed=<문자열>`
  - `size`가 없거나 잘못되면 7.
  - `seed`가 없으면 새 시드를 만들어 주소에 채운다.
  - `seed=fixed`이면 고정 퍼즐(5x5)을 연다.

## DOM 속성

| 선택자 | 대상 |
|---|---|
| `[data-testid="lobby"]` | 로비 화면 |
| `[data-testid="game-fence"]` | 로비의 울타리 치기 진입 버튼 |
| `[data-testid="fence-screen"]` | 게임 화면. `data-size`, `data-seed`, `data-solved="true\|false"` 속성을 가진다 |
| `[data-testid="board"]` | 보드 SVG |
| `[data-edge="<번호>"]` | 변의 터치 영역. `data-mark="0\|1\|2"` 속성을 가진다 |
| `[data-testid="timer"]` | 진행 중 타이머 |
| `[data-testid="size-5"]`, `size-7`, `size-10` | 판 크기 선택 |
| `[data-testid="undo"]`, `[data-testid="clear"]` | 되돌리기, 전체 지우기 |
| `[data-testid="complete"]` | 완성 화면. 완성 전에는 DOM에 없다 |
| `[data-testid="record-time"]` | 완성 화면의 기록 시간. `분:초.소수` 형식 |
| `[data-testid="new-game"]`, `[data-testid="to-lobby"]` | 완성 화면의 버튼 |
| `[data-testid="disclaimer"]` | 하단 고지 |

## 터치 영역

변마다 마름모 모양의 투명한 터치 영역을 둔다. 꼭짓점은 변의 양 끝 점과, 그 변에 닿은 두 칸의
중심이다(판 가장자리의 변은 바깥쪽으로 같은 거리만큼). 마름모들은 서로 겹치지 않고 판을 빈틈없이
덮는다.

## 개발 전용 훅

`import.meta.env.DEV`가 참일 때만 `window.__fence`를 둔다. 배포용 빌드에는 포함되지 않는다.

```ts
window.__fence = {
  size: number,
  seed: string,
  /** 칸마다의 숫자. 숫자가 없으면 null */
  clues: (number | null)[],
  /** 정답에서 선이 그어지는 변 번호 목록 */
  solution: number[],
};
```
