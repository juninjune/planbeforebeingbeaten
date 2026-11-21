import { edgeCount, type EdgeMark, type Puzzle } from "./grid";
import { isSolved } from "./judge";

export interface FenceState {
  marks: EdgeMark[];
  /** 되돌리기 기록. 가장 최근이 마지막 */
  history: { edge: number; prev: EdgeMark }[];
  solved: boolean;
}

export type FenceAction = { type: "cycle"; edge: number } | { type: "undo" } | { type: "clear" };

export function initialState(puzzle: Puzzle): FenceState {
  return { marks: new Array<EdgeMark>(edgeCount(puzzle.size)).fill(0), history: [], solved: false };
}

export function reduce(puzzle: Puzzle, state: FenceState, action: FenceAction): FenceState {
  if (state.solved) return state;
  switch (action.type) {
    case "cycle": {
      const { edge } = action;
      if (!Number.isInteger(edge) || edge < 0 || edge >= state.marks.length) return state;
      const prev = state.marks[edge]!;
      const next = ((prev + 1) % 3) as EdgeMark;
      const marks = state.marks.slice();
      marks[edge] = next;
      return { marks, history: [...state.history, { edge, prev }], solved: isSolved(puzzle, marks) };
    }
    case "undo": {
      const last = state.history[state.history.length - 1];
      if (!last) return state;
      const marks = state.marks.slice();
      marks[last.edge] = last.prev;
      return { marks, history: state.history.slice(0, -1), solved: isSolved(puzzle, marks) };
    }
    case "clear":
      return initialState(puzzle);
    default:
      return state;
  }
}
