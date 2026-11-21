import { edgeCount, edgeEnds, type EdgeMark } from "./grid";

export interface Hint {
  edge: number;
  mark: EdgeMark;
}

/**
 * 한 걸음 나아가는 힌트. 우선순위:
 * 1. 정답이 아닌데 그어진 선을 지운다
 * 2. 정답인데 X로 표시한 변을 선으로 바꾼다
 * 3. 아직 안 그은 정답 변을 긋는다(이미 그은 선의 끝점에 이어지는 변 우선)
 * 고칠 것이 없으면 null
 */
export function nextHint(size: number, marks: readonly EdgeMark[], solution: readonly number[]): Hint | null {
  const sol = new Set(solution);
  const count = edgeCount(size);

  for (let e = 0; e < count; e++) {
    if (marks[e] === 1 && !sol.has(e)) return { edge: e, mark: 0 };
  }
  for (let e = 0; e < count; e++) {
    if (marks[e] === 2 && sol.has(e)) return { edge: e, mark: 1 };
  }

  const todo = [...sol].filter((e) => marks[e] !== 1).sort((a, b) => a - b);
  if (todo.length === 0) return null;

  const degree = new Map<number, number>();
  for (let e = 0; e < count; e++) {
    if (marks[e] !== 1) continue;
    for (const p of edgeEnds(size, e)) degree.set(p, (degree.get(p) ?? 0) + 1);
  }
  const connects = (e: number) => edgeEnds(size, e).some((p) => degree.get(p) === 1);
  return { edge: todo.find(connects) ?? todo[0]!, mark: 1 };
}
