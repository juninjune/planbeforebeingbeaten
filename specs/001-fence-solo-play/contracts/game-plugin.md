# Contract: 게임 등록 인터페이스

`src/core/game.ts`

```ts
export interface GameScreenProps {
  /** 주소의 쿼리 값. 예: { size: "7", seed: "k3f9" } */
  params: Record<string, string>;
  /** 주소를 바꾼다. path는 "/" 또는 "/<gameId>", params는 쿼리 */
  navigate: (path: string, params?: Record<string, string>) => void;
}

export interface GameDefinition {
  id: string;
  title: string;
  tagline: string;
  Screen: React.ComponentType<GameScreenProps>;
  /** 로비 카드에 넣을 작은 미리보기. 없어도 된다 */
  Preview?: React.ComponentType;
}
```

`src/games/index.ts`

```ts
export const games: GameDefinition[] = [fence];
```

## 규칙

- 새 게임은 `src/games/<id>/`에 만들고 위 배열에 추가한다. 다른 게임의 파일과 `src/app`은 고치지 않는다.
- 셸(`src/app`)은 게임의 내부를 모른다. `games` 배열과 `GameDefinition`만 쓴다.
- 게임 화면은 자기 주소 쿼리를 스스로 해석하고, 잘못된 값은 기본값으로 대체한다.

## 주소

해시 라우팅을 쓴다.

- `#/` 로비
- `#/<gameId>?<query>` 게임 화면. 등록되지 않은 `gameId`는 로비로 보낸다.
