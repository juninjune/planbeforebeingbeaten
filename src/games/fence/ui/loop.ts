import { edgeEnds } from "../engine/grid";

/** 선 변들이 하나의 고리일 때 점을 이은 순서(시작점은 반복하지 않음). 고리가 아니면 빈 배열 */
export function orderLoop(size: number, edges: readonly number[]): number[] {
  if (edges.length === 0) return [];
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    const [a, b] = edgeEnds(size, e);
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const start = edgeEnds(size, edges[0]!)[0];
  const order = [start];
  let prev = -1;
  let cur = start;
  for (let i = 0; i < edges.length; i++) {
    const next = adj.get(cur)!.find((q) => q !== prev) ?? -1;
    if (next < 0) return [];
    if (next === start) return order.length === edges.length ? order : [];
    order.push(next);
    prev = cur;
    cur = next;
  }
  return [];
}
