import type { ComponentType } from "react";

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
  Screen: ComponentType<GameScreenProps>;
  /** 로비 카드에 보이는 작은 미리보기(선택) */
  Preview?: ComponentType;
}
