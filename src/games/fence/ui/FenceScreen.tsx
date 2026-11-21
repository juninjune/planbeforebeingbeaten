import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GameScreenProps } from "../../../core/game";
import { FIXED_PUZZLE } from "../engine/fixtures";
import { generate } from "../engine/generator";
import type { Puzzle, Size } from "../engine/grid";
import { solve } from "../engine/solver";
import { nextHint } from "../engine/hint";
import { initialState, reduce, type FenceAction } from "../engine/state";
import { toHash } from "../../../app/route";
import { Board } from "./Board";
import { hasSeenRules, markRulesSeen, Rules } from "./Rules";
import "./fence.css";

declare global {
  interface Window {
    __fence?: { size: number; seed: string; clues: (number | null)[]; solution: number[] };
  }
}

/** 밀리초를 분:초.소수두자리 로 바꾼다. 예: 7420 → "0:07.42" */
export function formatTime(ms: number): string {
  const cs = Math.floor(ms / 10);
  const minutes = Math.floor(cs / 6000);
  const seconds = Math.floor((cs % 6000) / 100);
  const rest = cs % 100;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(rest).padStart(2, "0")}`;
}

const SIZES: Size[] = [5, 7, 10];
const SEED_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function parseSize(raw: string | undefined): Size {
  return raw === "5" ? 5 : raw === "10" ? 10 : 7;
}

/** UI에서만 쓰는 새 시드. 엔진은 시드를 받기만 한다 */
function newSeed(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SEED_CHARS[b % SEED_CHARS.length]).join("");
}

interface PlayProps {
  puzzle: Puzzle;
  solution: number[];
  navigate: GameScreenProps["navigate"];
  /** 첫 방문 규칙 안내가 열려 있는 동안 타이머를 시작하지 않는다 */
  gate: boolean;
  onOpenRules: () => void;
}

function Play({ puzzle, solution, navigate, gate, onOpenRules }: PlayProps) {
  const [state, dispatch] = useReducer((s: ReturnType<typeof initialState>, a: FenceAction) => reduce(puzzle, s, a), puzzle, initialState);
  const startRef = useRef(performance.now());
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState(0);
  const [hl, setHl] = useState<{ edge: number; id: number } | null>(null);

  // 완성되는 렌더에서 곧바로 기록을 고정한다(완성 화면 텍스트가 즉시 채워지도록)
  const finalRef = useRef<number | null>(null);
  if (state.solved && finalRef.current === null) finalRef.current = performance.now() - startRef.current;
  const shown = finalRef.current ?? elapsed;

  useEffect(() => {
    if (state.solved || gate) return;
    startRef.current = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    return () => window.clearInterval(id);
  }, [state.solved, gate]);

  useEffect(() => {
    if (!hl) return;
    const id = window.setTimeout(() => setHl(null), 1200);
    return () => window.clearTimeout(id);
  }, [hl]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__fence = { size: puzzle.size, seed: puzzle.seed, clues: puzzle.clues, solution };
  }, [puzzle, solution]);

  const giveHint = () => {
    const h = nextHint(puzzle.size, state.marks, solution);
    if (!h) return;
    dispatch({ type: "set", edge: h.edge, mark: h.mark });
    setHints((n) => n + 1);
    setHl((prev) => ({ edge: h.edge, id: (prev?.id ?? 0) + 1 }));
  };

  const open = (size: Size) => navigate("/fence", { size: String(size), seed: newSeed() });

  return (
    <section className="fence" data-testid="fence-screen" data-size={puzzle.size} data-seed={puzzle.seed} data-solved={state.solved ? "true" : "false"}>
      <div className="fence-lit" aria-hidden="true" />
      <header className="fence-head">
        <h1>울타리 치기</h1>
        <div className="fence-head-right">
          {hints > 0 && (
            <span className="fence-hint-count" data-testid="hint-count">
              힌트 {hints}
            </span>
          )}
          <span className="fence-timer" data-testid="timer">
            {formatTime(shown)}
          </span>
          <button type="button" className="fence-rules-btn" data-testid="rules-open" onClick={onOpenRules}>
            규칙
          </button>
        </div>
      </header>
      <div className="fence-sizes">
        {SIZES.map((n) => (
          <button key={n} type="button" data-testid={`size-${n}`} aria-pressed={puzzle.size === n} onClick={() => open(n)}>
            {n}x{n}
          </button>
        ))}
      </div>
      <Board puzzle={puzzle} marks={state.marks} solved={state.solved} highlightEdge={hl?.edge ?? null} onCycle={(edge) => dispatch({ type: "cycle", edge })} />
      <div className="fence-tools">
        <button type="button" data-testid="undo" disabled={state.solved || state.history.length === 0} onClick={() => dispatch({ type: "undo" })}>
          되돌리기
        </button>
        <button type="button" data-testid="clear" disabled={state.solved} onClick={() => dispatch({ type: "clear" })}>
          전체 지우기
        </button>
        <button type="button" data-testid="hint" disabled={state.solved} onClick={giveHint}>
          힌트
        </button>
      </div>
      {state.solved && (
        <div className="fence-complete" data-testid="complete">
          <h2>완성</h2>
          <p>
            기록 <strong data-testid="record-time">{formatTime(shown)}</strong>
          </p>
          {hints > 0 && (
            <p className="fence-record-hints" data-testid="record-hints">
              힌트 {hints}회 사용
            </p>
          )}
          <div className="fence-actions">
            <button type="button" data-testid="new-game" onClick={() => open(puzzle.size)}>
              새 판
            </button>
            <button type="button" data-testid="to-lobby" onClick={() => navigate("/")}>
              로비로
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function FenceScreen({ params, navigate }: GameScreenProps) {
  const size = parseSize(params.size);
  // seed가 없으면 새 시드를 만들어 주소에 채운다(주소만 바꾸고 화면은 다시 열지 않는다)
  const [fallback] = useState(newSeed);
  const seed = params.seed || fallback;

  useEffect(() => {
    if (!params.seed) window.history.replaceState(null, "", toHash("/fence", { size: String(size), seed }));
  }, [params.seed, size, seed]);

  const puzzle = useMemo(() => (seed === "fixed" ? FIXED_PUZZLE : generate(size, seed)), [size, seed]);
  const solution = useMemo(() => solve(puzzle).solution ?? [], [puzzle]);

  // 첫 방문이면 규칙을 자동으로 열고, 닫는 순간 타이머가 시작된다
  const [first, setFirst] = useState(() => !hasSeenRules());
  const [rulesOpen, setRulesOpen] = useState(first);
  const closeRules = useCallback(() => {
    markRulesSeen();
    setRulesOpen(false);
    setFirst(false);
  }, []);

  return (
    <>
      <Play
        key={`${puzzle.size}:${puzzle.seed}`}
        puzzle={puzzle}
        solution={solution}
        navigate={navigate}
        gate={first}
        onOpenRules={() => setRulesOpen(true)}
      />
      {rulesOpen && <Rules first={first} onClose={closeRules} />}
    </>
  );
}
