import { useEffect, useRef, type ReactElement } from "react";

const RULES_SEEN_KEY = "fence.rulesSeen";

export function hasSeenRules(): boolean {
  try {
    return window.localStorage.getItem(RULES_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function markRulesSeen(): void {
  try {
    window.localStorage.setItem(RULES_SEEN_KEY, "1");
  } catch {
    // 저장소를 못 쓰면 다음에도 자동으로 열린다
  }
}

const D = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r={2.6} className="rules-dot" />;

/** (1) 탭: 선, X, 지움 */
function TapArt() {
  const X = ({ x }: { x: number }) => (
    <path d={`M${x - 4} -4L${x + 4} 4M${x - 4} 4L${x + 4} -4`} className="rules-x" />
  );
  return (
    <svg viewBox="-6 -14 136 28" className="rules-art rules-art-wide" aria-hidden="true">
      <D x={0} y={0} />
      <line x1={0} y1={0} x2={30} y2={0} className="rules-line" />
      <D x={30} y={0} />
      <D x={48} y={0} />
      <X x={63} />
      <D x={78} y={0} />
      <D x={96} y={0} />
      <D x={126} y={0} />
    </svg>
  );
}

/** (2) 하나의 고리 */
function LoopArt() {
  return (
    <svg viewBox="-6 -6 62 52" className="rules-art" aria-hidden="true">
      <polygon points="0,0 30,0 30,20 50,20 50,40 0,40" className="rules-loop" />
      {[0, 10, 20, 30, 40, 50].flatMap((x) => [0, 10, 20, 30, 40].map((y) => <D key={`${x}-${y}`} x={x} y={y} />))}
    </svg>
  );
}

/** (3) 숫자 칸 */
function ClueArt() {
  return (
    <svg viewBox="-6 -6 62 52" className="rules-art" aria-hidden="true">
      <polyline points="10,0 40,0 40,30" className="rules-line" fill="none" />
      <text x={25} y={15} textAnchor="middle" dominantBaseline="central" className="rules-clue">
        2
      </text>
      {[10, 25, 40].flatMap((x) => [0, 15, 30].map((y) => <D key={`${x}-${y}`} x={x} y={y} />))}
    </svg>
  );
}

/** (4) 0과 3 */
function ZeroThreeArt() {
  return (
    <svg viewBox="-6 -6 92 42" className="rules-art rules-art-wide" aria-hidden="true">
      <text x={15} y={15} textAnchor="middle" dominantBaseline="central" className="rules-clue">
        0
      </text>
      <polyline points="45,0 75,0 75,30 45,30" className="rules-line" fill="none" />
      <text x={60} y={15} textAnchor="middle" dominantBaseline="central" className="rules-clue">
        3
      </text>
      {[0, 30, 45, 75].flatMap((x) => [0, 30].map((y) => <D key={`${x}-${y}`} x={x} y={y} />))}
    </svg>
  );
}

const ITEMS: { art: ReactElement; text: string }[] = [
  { art: <TapArt />, text: "점과 점 사이를 탭하면 선이 그어집니다. 한 번 더 탭하면 X 표시, 또 탭하면 지워집니다." },
  { art: <LoopArt />, text: "선은 갈라지거나 끊기지 않는 하나의 고리가 되어야 합니다." },
  { art: <ClueArt />, text: "칸의 숫자는 그 칸을 둘러싼 선의 개수입니다. 숫자가 없는 칸은 몇 개든 괜찮습니다." },
  { art: <ZeroThreeArt />, text: "0 옆에는 선이 없고, 3은 한 변만 비어 있습니다. 여기서부터 시작해 보세요. 막히면 힌트를 누르세요." },
];

interface RulesProps {
  /** 첫 방문 자동 안내이면 닫기 버튼이 "시작"이다 */
  first: boolean;
  onClose: () => void;
}

export function Rules({ first, onClose }: RulesProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rules-backdrop">
      <div className="rules-sheet" data-testid="rules" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <h2 id="rules-title">규칙</h2>
        <ol className="rules-list">
          {ITEMS.map((item, i) => (
            <li key={i}>
              {item.art}
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
        <button ref={closeRef} type="button" className="rules-close" data-testid="rules-close" onClick={onClose}>
          {first ? "시작" : "닫기"}
        </button>
      </div>
    </div>
  );
}
