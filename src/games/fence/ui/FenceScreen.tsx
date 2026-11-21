import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GameScreenProps } from "../../../core/game";
import { dailySeed, kstDateKey } from "../engine/daily";
import { FIXED_PUZZLE } from "../engine/fixtures";
import { generate } from "../engine/generator";
import type { Puzzle, Size } from "../engine/grid";
import { solve } from "../engine/solver";
import { nextHint } from "../engine/hint";
import { initialState, reduce, type FenceAction } from "../engine/state";
import { toHash } from "../../../app/route";
import { trackEvent } from "../../../core/analytics";
import { buildShareParams, judgeChallenge, parseChallenge, type Challenge } from "../challenge";
import { formatTime } from "../format";
import { applyCompletion, currentStreak, loadRecords, saveRecords, type FenceRecords, type SizeKey } from "../records";
import { Board } from "./Board";
import { ShareSheet } from "./ShareSheet";
import { hasSeenRules, markRulesSeen, Rules } from "./Rules";
import "./fence.css";

declare global {
  interface Window {
    __fence?: { size: number; seed: string; clues: (number | null)[]; solution: number[] };
  }
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
  /** 오늘의 판이면 그 날짜(화면을 연 시점에 고정), 자유 판이면 null */
  dailyKey: string | null;
  records: FenceRecords;
  onRecords: (r: FenceRecords) => void;
  /** 도전장으로 연 판의 도전 기록 */
  challenge: Challenge | null;
}

function Play({ puzzle, solution, navigate, gate, onOpenRules, dailyKey, records, onRecords, challenge }: PlayProps) {
  const [state, dispatch] = useReducer((s: ReturnType<typeof initialState>, a: FenceAction) => reduce(puzzle, s, a), puzzle, initialState);
  const startRef = useRef(performance.now());
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState(0);
  const [hl, setHl] = useState<{ edge: number; id: number } | null>(null);

  // 완성되는 렌더에서 곧바로 기록을 고정한다(완성 화면 텍스트가 즉시 채워지도록)
  const finalRef = useRef<number | null>(null);
  if (state.solved && finalRef.current === null) finalRef.current = performance.now() - startRef.current;
  const shown = finalRef.current ?? elapsed;
  const mineMs = Math.round(finalRef.current ?? 0);
  const [shareOpen, setShareOpen] = useState(false);

  // 완성 기록은 완성되는 렌더에서 한 번 계산하고(순수), 저장은 효과에서 한다. 고정 퍼즐은 기록하지 않는다
  const resultRef = useRef<ReturnType<typeof applyCompletion> | null>(null);
  if (state.solved && resultRef.current === null && puzzle.seed !== "fixed") {
    resultRef.current = applyCompletion(records, { size: puzzle.size, ms: mineMs, hints, dailyKey });
  }
  const result = resultRef.current;
  const shownRecords = result?.records ?? records;
  const sizeKey = String(puzzle.size) as SizeKey;
  const sizeRec = shownRecords.sizes[sizeKey];
  // 이미 푼 오늘의 판 안내는 열 때의 기록으로 정한다
  const [doneAtOpen] = useState(() => (dailyKey ? (records.daily.done[dailyKey]?.[sizeKey]?.ms ?? null) : null));

  useEffect(() => {
    if (!result) return;
    saveRecords(result.records);
    onRecords(result.records);
    // 완성 한 번에 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (state.solved || gate) return;
    startRef.current = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    return () => window.clearInterval(id);
  }, [state.solved, gate]);

  // 통계 이벤트: ref로 막아 같은 판에서 한 번만 보낸다(개발 중 효과 이중 실행 포함)
  const sizeN = puzzle.size;
  const startedRef = useRef(false);
  const completeSentRef = useRef(false);
  const hintSentRef = useRef(false);
  useEffect(() => {
    if (gate || startedRef.current) return;
    startedRef.current = true;
    trackEvent(`fence/start/${sizeN}`);
  }, [gate, sizeN]);
  useEffect(() => {
    if (!state.solved || completeSentRef.current) return;
    completeSentRef.current = true;
    trackEvent(`fence/complete/${sizeN}`);
    if (dailyKey !== null && doneAtOpen === null) trackEvent(`fence/daily-complete/${sizeN}`);
  }, [state.solved, sizeN, dailyKey, doneAtOpen]);

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
    if (!hintSentRef.current) {
      hintSentRef.current = true;
      trackEvent(`fence/hint/${sizeN}`);
    }
    dispatch({ type: "set", edge: h.edge, mark: h.mark });
    setHints((n) => n + 1);
    setHl((prev) => ({ edge: h.edge, id: (prev?.id ?? 0) + 1 }));
  };

  const daily = dailyKey !== null;
  const open = (size: Size) => navigate("/fence", daily ? { size: String(size), daily: "1" } : { size: String(size), seed: newSeed() });
  const openFree = (size: Size) => navigate("/fence", { size: String(size), seed: newSeed() });
  const toggleDaily = () => (daily ? openFree(puzzle.size as Size) : navigate("/fence", { size: String(puzzle.size), daily: "1" }));
  const judged = state.solved && challenge ? judgeChallenge(challenge, { ms: mineMs, hints }) : null;
  const shareUrl = () =>
    `${window.location.origin}${window.location.pathname}#/fence?${new URLSearchParams(
      buildShareParams({ size: puzzle.size, seed: puzzle.seed, ms: mineMs, hints }),
    )}`;
  const dateLabel = dailyKey ? `${Number(dailyKey.slice(5, 7))}월 ${Number(dailyKey.slice(8, 10))}일` : "";

  return (
    <section className="fence" data-testid="fence-screen" data-size={puzzle.size} data-seed={puzzle.seed} data-solved={state.solved ? "true" : "false"} data-daily={daily ? "true" : "false"}>
      <div className="fence-lit" aria-hidden="true" />
      <header className="fence-head">
        <div className="fence-title">
          <h1>울타리 치기</h1>
          {daily && (
            <span className="fence-daily-label" data-testid="daily-label">
              오늘의 판 · {dateLabel}
            </span>
          )}
        </div>
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
          <button
            key={n}
            type="button"
            data-testid={`size-${n}`}
            data-daily-done={daily ? String(records.daily.done[dailyKey]?.[String(n) as SizeKey] !== undefined) : undefined}
            aria-pressed={puzzle.size === n}
            onClick={() => open(n)}
          >
            {n}x{n}
            {daily && records.daily.done[dailyKey]?.[String(n) as SizeKey] !== undefined ? " ✓" : ""}
          </button>
        ))}
        <button type="button" className="fence-daily-toggle" data-testid="daily-toggle" aria-pressed={daily} onClick={toggleDaily}>
          오늘의 판
        </button>
      </div>
      {challenge && (
        <p className="fence-challenge-banner" data-testid="challenge-banner" data-ms={challenge.ms} data-hints={challenge.hints}>
          도전 기록 {formatTime(challenge.ms)} · {challenge.hints === 0 ? "힌트 없음" : `힌트 ${challenge.hints}회`}
        </p>
      )}
      <Board puzzle={puzzle} marks={state.marks} solved={state.solved} highlightEdge={hl?.edge ?? null} onCycle={(edge) => dispatch({ type: "cycle", edge })} />
      <div className="fence-tools">
        <button type="button" data-testid="undo" disabled={state.solved || state.history.length === 0} onClick={() => dispatch({ type: "undo" })}>
          되돌리기
        </button>
        <button type="button" data-testid="clear" disabled={state.solved} onClick={() => dispatch({ type: "clear" })}>
          전체 지우기
        </button>
        {!daily && (
          <button type="button" data-testid="hint" disabled={state.solved} onClick={giveHint}>
            힌트
          </button>
        )}
      </div>
      <p className="fence-stats">
        <span data-testid="best-time" data-empty={sizeRec.best === null ? "true" : "false"}>
          최고 {sizeRec.best === null ? "-" : formatTime(sizeRec.best)}
        </span>
        <span aria-hidden="true"> · </span>
        <span data-testid="solved-count" data-count={sizeRec.solved}>
          푼 판 {sizeRec.solved}
        </span>
      </p>
      {daily && doneAtOpen !== null && (
        <p className="fence-daily-note" data-testid="daily-done-note">
          오늘 이미 풀었습니다 · {formatTime(doneAtOpen)}
        </p>
      )}
      {state.solved && (
        <div className="fence-complete" data-testid="complete">
          <h2>
            완성
            {result?.newBest && (
              <span className="fence-new-best" data-testid="new-best">
                최고 기록
              </span>
            )}
          </h2>
          <p>
            기록 <strong data-testid="record-time">{formatTime(shown)}</strong>
          </p>
          <p className="fence-record-meta">
            {hints > 0 && <span data-testid="record-hints">힌트 {hints}회 사용</span>}
            {daily && (
              <span data-testid="daily-streak">연속 {currentStreak(shownRecords, dailyKey)}일</span>
            )}
          </p>
          {judged && challenge && (
            <p className={`fence-challenge-result is-${judged.outcome}`} data-testid="challenge-result" data-outcome={judged.outcome}>
              {judged.outcome === "win" && `도전 성공 · ${formatTime(judged.diffMs)} 빠름`}
              {judged.outcome === "lose" && `도전 실패 · ${formatTime(judged.diffMs)} 느림`}
              {judged.outcome === "tie" && "무승부"}
              {judged.outcome === "assisted" && "힌트를 더 써서 비교에서 제외"}
            </p>
          )}
          <div className="fence-actions">
            <button type="button" data-testid="new-game" onClick={() => openFree(puzzle.size as Size)}>
              {daily ? "자유 판" : "새 판"}
            </button>
            <button type="button" data-testid="share" onClick={() => {
                trackEvent(`fence/share/${sizeN}`);
                setShareOpen(true);
              }}>
              공유
            </button>
            <button type="button" data-testid="to-lobby" onClick={() => navigate("/")}>
              로비로
            </button>
          </div>
        </div>
      )}
      {shareOpen && (
        <ShareSheet
          card={{
            size: puzzle.size,
            ms: mineMs,
            hints,
            dailyLabel: daily ? `오늘의 판 · ${dateLabel}` : null,
            title: "울타리 치기",
          }}
          url={shareUrl()}
          text={`울타리 치기 ${puzzle.size}x${puzzle.size} · ${formatTime(mineMs)} · 이 기록을 깨 보세요`}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}

export function FenceScreen({ params, navigate }: GameScreenProps) {
  const size = parseSize(params.size);
  // 오늘의 판의 날짜는 판을 여는 시점(주소가 바뀔 때)에 한 번 정해 고정한다
  const dateKey = useMemo(() => kstDateKey(Date.now()), [params.daily, params.seed, size]); // eslint-disable-line react-hooks/exhaustive-deps
  // daily=1이거나 seed가 오늘의 dailySeed와 같으면 오늘의 판. 다른 날짜의 daily- 시드는 자유 판이다
  const daily = params.daily === "1" || params.seed === dailySeed(dateKey);
  const challenge = useMemo(() => (params.seed && params.daily !== "1" ? parseChallenge(params) : null), [params]);
  // seed가 없으면 새 시드를 만들어 주소에 채운다(주소만 바꾸고 화면은 다시 열지 않는다)
  const [fallback] = useState(newSeed);
  const seed = daily ? dailySeed(dateKey) : params.seed || fallback;

  useEffect(() => {
    if (!daily && !params.seed) window.history.replaceState(null, "", toHash("/fence", { size: String(size), seed }));
  }, [daily, params.seed, size, seed]);

  const puzzle = useMemo(() => (seed === "fixed" ? FIXED_PUZZLE : generate(size, seed)), [size, seed]);
  const solution = useMemo(() => solve(puzzle).solution ?? [], [puzzle]);
  const [records, setRecords] = useState(loadRecords);

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
        dailyKey={daily ? dateKey : null}
        records={records}
        onRecords={setRecords}
        challenge={challenge}
      />
      {rulesOpen && <Rules first={first} onClose={closeRules} />}
    </>
  );
}
