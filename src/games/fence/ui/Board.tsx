import { cellEdges, edgeCount, edgeEnds, type EdgeMark, type Puzzle } from "../engine/grid";
import { orderLoop } from "./loop";

interface BoardProps {
  puzzle: Puzzle;
  marks: readonly EdgeMark[];
  solved: boolean;
  /** 힌트로 바뀐 변. 잠시 강조한다 */
  highlightEdge?: number | null;
  onCycle: (edge: number) => void;
}

// 칸 하나를 100 단위로 그린다. 점 (r, c)는 (x = c * U, y = r * U)
const U = 100;
const MARGIN = 60;

function pointXY(size: number, p: number): [number, number] {
  return [(p % (size + 1)) * U, Math.floor(p / (size + 1)) * U];
}

/** 변에 닿은 두 칸의 중심. 가장자리 변은 바깥쪽으로 같은 거리만큼 */
function sideCenters(size: number, edge: number): [[number, number], [number, number]] {
  const hCount = size * (size + 1);
  if (edge < hCount) {
    const r = Math.floor(edge / size);
    const c = edge % size;
    const x = (c + 0.5) * U;
    return [
      [x, (r - 0.5) * U],
      [x, (r + 0.5) * U],
    ];
  }
  const e = edge - hCount;
  const r = Math.floor(e / (size + 1));
  const c = e % (size + 1);
  const y = (r + 0.5) * U;
  return [
    [(c - 0.5) * U, y],
    [(c + 0.5) * U, y],
  ];
}

export function Board({ puzzle, marks, solved, highlightEdge = null, onCycle }: BoardProps) {
  const { size, clues } = puzzle;
  const total = size * U + MARGIN * 2;
  const edges = Array.from({ length: edgeCount(size) }, (_, i) => i);

  // 완성 시 고리를 따라 도는 빛에 쓰는 하나의 경로
  let revealPath = "";
  if (solved) {
    const lines = edges.filter((e) => marks[e] === 1);
    const order = orderLoop(size, lines);
    if (order.length > 0) {
      revealPath = order.map((p, i) => `${i === 0 ? "M" : "L"}${pointXY(size, p).join(" ")}`).join("") + "Z";
    }
  }

  return (
    <svg
      className="fence-board"
      data-testid="board"
      data-solved={solved ? "true" : "false"}
      viewBox={`${-MARGIN} ${-MARGIN} ${total} ${total}`}
      role="img"
      aria-label={`${size}x${size} 울타리 판`}
    >
      {clues.map((clue, i) => {
        if (clue === null) return null;
        const r = Math.floor(i / size);
        const c = i % size;
        const n = cellEdges(size, r, c).filter((e) => marks[e] === 1).length;
        const state = n === clue ? "met" : n > clue ? "over" : "open";
        return (
          <text
            key={`clue-${i}`}
            className="fence-clue"
            data-clue-state={state}
            x={(c + 0.5) * U}
            y={(r + 0.5) * U}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {clue}
          </text>
        );
      })}

      {edges.map((e) => {
        if (marks[e] !== 1) return null;
        const [a, b] = edgeEnds(size, e);
        const [x1, y1] = pointXY(size, a);
        const [x2, y2] = pointXY(size, b);
        return <line key={`line-${e}`} className="fence-line" data-mark="1" pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}

      {edges.map((e) => {
        if (marks[e] !== 2) return null;
        const [a, b] = edgeEnds(size, e);
        const [x1, y1] = pointXY(size, a);
        const [x2, y2] = pointXY(size, b);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const d = 9;
        return (
          <path
            key={`x-${e}`}
            className="fence-x"
            data-mark="2"
            d={`M${mx - d} ${my - d}L${mx + d} ${my + d}M${mx - d} ${my + d}L${mx + d} ${my - d}`}
          />
        );
      })}

      {revealPath && <path className="fence-reveal" d={revealPath} pathLength={1} />}

      {Array.from({ length: (size + 1) * (size + 1) }, (_, p) => {
        const [x, y] = pointXY(size, p);
        return <circle key={`dot-${p}`} className="fence-dot" cx={x} cy={y} r={5} />;
      })}

      {highlightEdge !== null && (() => {
        const [a, b] = edgeEnds(size, highlightEdge);
        const [x1, y1] = pointXY(size, a);
        const [x2, y2] = pointXY(size, b);
        return <line key={`hint-${highlightEdge}`} className="fence-hint" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })()}

      {edges.map((e) => {
        const [a, b] = edgeEnds(size, e);
        const [ca, cb] = sideCenters(size, e);
        const pa = pointXY(size, a);
        const pb = pointXY(size, b);
        const points = [pa, ca, pb, cb].map((p) => p.join(",")).join(" ");
        return (
          <polygon
            key={`hit-${e}`}
            className="fence-hit"
            data-edge={e}
            data-mark={marks[e]}
            data-hint={e === highlightEdge ? "true" : undefined}
            points={points}
            onClick={() => onCycle(e)}
          />
        );
      })}
    </svg>
  );
}
