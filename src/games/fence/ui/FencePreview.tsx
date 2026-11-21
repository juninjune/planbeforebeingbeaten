import { FIXED_SOLUTION } from "../engine/fixtures";
import { orderLoop } from "./loop";

const SIZE = 5;
const U = 20;

/** 로비 카드용 정적 미리보기: 고정 퍼즐의 고리 */
export function FencePreview() {
  const pts = orderLoop(SIZE, FIXED_SOLUTION).map((p) => `${(p % (SIZE + 1)) * U},${Math.floor(p / (SIZE + 1)) * U}`);
  const dots = Array.from({ length: (SIZE + 1) * (SIZE + 1) }, (_, p) => [(p % (SIZE + 1)) * U, Math.floor(p / (SIZE + 1)) * U] as const);
  return (
    <svg className="fence-preview" viewBox={`-10 -10 ${SIZE * U + 20} ${SIZE * U + 20}`} aria-hidden="true">
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} className="fence-preview-dot" />
      ))}
      <polygon points={pts.join(" ")} className="fence-preview-loop" />
    </svg>
  );
}
