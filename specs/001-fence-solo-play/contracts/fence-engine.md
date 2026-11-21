# Contract: 울타리 치기 엔진

`src/games/fence/engine/`. React, DOM, 시계, `Math.random`에 의존하지 않는다. 타입은
[data-model.md](../data-model.md)를 따른다.

```ts
// grid.ts
export function edgeCount(size: number): number;
export function hEdge(size: number, r: number, c: number): number;
export function vEdge(size: number, r: number, c: number): number;
export function cellEdges(size: number, r: number, c: number): [number, number, number, number];
/** 변의 양 끝 점. 점 번호는 r * (size + 1) + c */
export function edgeEnds(size: number, edge: number): [number, number];

// judge.ts
/** marks에서 값이 1인 변만 선으로 본다 */
export function isSolved(puzzle: Puzzle, marks: readonly EdgeMark[]): boolean;

// state.ts
export function initialState(puzzle: Puzzle): FenceState;
export function reduce(puzzle: Puzzle, state: FenceState, action: FenceAction): FenceState;

// solver.ts
export interface SolveResult {
  /** 찾은 해의 수. limit에서 멈춘다 */
  count: number;
  /** 첫 번째 해의 선 변 번호 목록(오름차순). 해가 없으면 null */
  solution: number[] | null;
  /** 노드 상한에 걸려 탐색을 끝내지 못했으면 true */
  exhausted: boolean;
}
export function solve(puzzle: Puzzle, opts?: { limit?: number; maxNodes?: number }): SolveResult;

// generator.ts
/** 같은 size와 seed는 항상 같은 Puzzle을 돌려준다. 돌려준 퍼즐은 해가 정확히 하나다 */
export function generate(size: 5 | 7 | 10, seed: string): Puzzle;

// fixtures.ts
export const FIXED_PUZZLE: Puzzle; // 5x5, seed "fixed"
```

## 보장

- `reduce`는 입력 상태를 바꾸지 않고 새 상태를 돌려준다.
- `reduce` 결과의 `solved`는 `isSolved(puzzle, marks)`와 같다. 단 한 번 `true`가 되면 계속 `true`다.
- `generate`는 시간에 의존하는 예산을 쓰지 않는다. 탐색 예산은 노드 수와 시도 횟수로만 정한다.
- `solve(generate(size, seed), { limit: 2 }).count === 1`이 모든 `size`와 `seed`에서 성립한다.
