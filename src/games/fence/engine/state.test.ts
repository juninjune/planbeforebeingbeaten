import { describe, expect, it } from "vitest";
import { FIXED_PUZZLE, FIXED_SOLUTION } from "./fixtures";
import { initialState, reduce } from "./state";

const P = FIXED_PUZZLE;

describe("reduce cycle", () => {
  it("0 → 1 → 2 → 0 으로 순환하고 기록이 쌓인다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    expect(s.marks[3]).toBe(1);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    expect(s.marks[3]).toBe(2);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    expect(s.marks[3]).toBe(0);
    expect(s.history).toEqual([
      { edge: 3, prev: 0 },
      { edge: 3, prev: 1 },
      { edge: 3, prev: 2 },
    ]);
  });

  it("정답을 모두 그으면 solved가 된다", () => {
    let s = initialState(P);
    for (const e of FIXED_SOLUTION.slice(0, -1)) s = reduce(P, s, { type: "cycle", edge: e });
    expect(s.solved).toBe(false);
    s = reduce(P, s, { type: "cycle", edge: FIXED_SOLUTION.at(-1)! });
    expect(s.solved).toBe(true);
  });

  it("완성 후 행동은 무시된다", () => {
    let s = initialState(P);
    for (const e of FIXED_SOLUTION) s = reduce(P, s, { type: "cycle", edge: e });
    const after = reduce(P, s, { type: "cycle", edge: 4 });
    expect(after).toBe(s);
    expect(after.marks[4]).toBe(0);
  });

  it("범위 밖 변은 무시된다", () => {
    const s = initialState(P);
    expect(reduce(P, s, { type: "cycle", edge: -1 })).toBe(s);
    expect(reduce(P, s, { type: "cycle", edge: 60 })).toBe(s);
    expect(reduce(P, s, { type: "cycle", edge: 1.5 })).toBe(s);
  });

  it("입력 상태를 바꾸지 않는다", () => {
    const s = initialState(P);
    const snapshot = JSON.stringify(s);
    const next = reduce(P, s, { type: "cycle", edge: 5 });
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(next).not.toBe(s);
    expect(next.marks).not.toBe(s.marks);
  });
});

describe("reduce undo", () => {
  it("한 단계 복원한다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    s = reduce(P, s, { type: "cycle", edge: 5 });
    s = reduce(P, s, { type: "undo" });
    expect(s.marks[5]).toBe(0);
    expect(s.marks[3]).toBe(1);
    expect(s.history).toEqual([{ edge: 3, prev: 0 }]);
  });

  it("같은 변을 여러 번 돌린 뒤에도 이전 값으로 돌아간다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    s = reduce(P, s, { type: "cycle", edge: 3 });
    s = reduce(P, s, { type: "undo" });
    expect(s.marks[3]).toBe(1);
    s = reduce(P, s, { type: "undo" });
    expect(s.marks[3]).toBe(0);
  });

  it("기록이 없으면 무시한다", () => {
    const s = initialState(P);
    expect(reduce(P, s, { type: "undo" })).toBe(s);
  });

  it("여러 번 연속으로 되돌릴 수 있다", () => {
    let s = initialState(P);
    for (const e of [1, 2, 3]) s = reduce(P, s, { type: "cycle", edge: e });
    for (let i = 0; i < 3; i++) s = reduce(P, s, { type: "undo" });
    expect(s).toEqual(initialState(P));
    expect(reduce(P, s, { type: "undo" })).toBe(s);
  });

  it("입력 상태를 바꾸지 않는다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 3 });
    const snapshot = JSON.stringify(s);
    const next = reduce(P, s, { type: "undo" });
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(next.marks).not.toBe(s.marks);
  });

  it("완성 후에는 무시한다", () => {
    let s = initialState(P);
    for (const e of FIXED_SOLUTION) s = reduce(P, s, { type: "cycle", edge: e });
    expect(reduce(P, s, { type: "undo" })).toBe(s);
  });
});

describe("reduce clear", () => {
  it("모든 변을 0으로, 기록을 비운다", () => {
    let s = initialState(P);
    for (const e of [1, 2, 2, 7]) s = reduce(P, s, { type: "cycle", edge: e });
    const next = reduce(P, s, { type: "clear" });
    expect(next.marks.every((m) => m === 0)).toBe(true);
    expect(next.history).toEqual([]);
    expect(next.solved).toBe(false);
  });

  it("입력 상태를 바꾸지 않는다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 4 });
    const snapshot = JSON.stringify(s);
    const next = reduce(P, s, { type: "clear" });
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(next).not.toBe(s);
    expect(next.marks).not.toBe(s.marks);
  });

  it("완성 후에는 무시한다", () => {
    let s = initialState(P);
    for (const e of FIXED_SOLUTION) s = reduce(P, s, { type: "cycle", edge: e });
    const after = reduce(P, s, { type: "clear" });
    expect(after).toBe(s);
    expect(after.solved).toBe(true);
  });

  it("clear 뒤에도 다시 풀 수 있다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "cycle", edge: 4 });
    s = reduce(P, s, { type: "clear" });
    for (const e of FIXED_SOLUTION) s = reduce(P, s, { type: "cycle", edge: e });
    expect(s.solved).toBe(true);
  });
});

describe("reduce set", () => {
  it("지정한 값으로 바꾸고 기록에 넣는다", () => {
    let s = initialState(P);
    s = reduce(P, s, { type: "set", edge: 3, mark: 2 });
    expect(s.marks[3]).toBe(2);
    expect(s.history).toEqual([{ edge: 3, prev: 0 }]);
    s = reduce(P, s, { type: "undo" });
    expect(s.marks[3]).toBe(0);
  });

  it("값이 같으면 상태를 그대로 돌려준다", () => {
    const s = initialState(P);
    expect(reduce(P, s, { type: "set", edge: 3, mark: 0 })).toBe(s);
  });

  it("범위 밖 변과 잘못된 값은 무시한다", () => {
    const s = initialState(P);
    expect(reduce(P, s, { type: "set", edge: -1, mark: 1 })).toBe(s);
    expect(reduce(P, s, { type: "set", edge: 60, mark: 1 })).toBe(s);
    expect(reduce(P, s, { type: "set", edge: 1.5, mark: 1 })).toBe(s);
    expect(reduce(P, s, { type: "set", edge: 1, mark: 3 as never })).toBe(s);
  });

  it("정답을 모두 set하면 solved가 되고 이후 무시한다", () => {
    let s = initialState(P);
    for (const e of FIXED_SOLUTION) s = reduce(P, s, { type: "set", edge: e, mark: 1 });
    expect(s.solved).toBe(true);
    expect(reduce(P, s, { type: "set", edge: 4, mark: 1 })).toBe(s);
  });

  it("입력 상태를 바꾸지 않는다", () => {
    const s = initialState(P);
    const snapshot = JSON.stringify(s);
    const next = reduce(P, s, { type: "set", edge: 5, mark: 1 });
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(next.marks).not.toBe(s.marks);
  });
});
