import type { GameDefinition } from "../../core/game";
import { FencePreview } from "./ui/FencePreview";
import { FenceScreen } from "./ui/FenceScreen";

export const fence: GameDefinition = {
  id: "fence",
  title: "울타리 치기",
  tagline: "숫자에 맞춰 점을 이어 하나의 닫힌 고리를 만드세요.",
  Screen: FenceScreen,
  Preview: FencePreview,
};
