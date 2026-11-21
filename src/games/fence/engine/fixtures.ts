import type { Puzzle } from "./grid";

// 굴곡 있는 고리 하나(칸 영역의 경계)에서 25칸 숫자를 모두 계산했다.
export const FIXED_PUZZLE: Puzzle = {
  size: 5,
  seed: "fixed",
  clues: [2, 2, 2, 0, 0, 2, 0, 2, 2, 1, 2, 2, 1, 1, 2, 0, 1, 2, 2, 1, 0, 0, 0, 2, 3],
};

/** 정답에서 선이 그어지는 변 번호(오름차순) */
export const FIXED_SOLUTION: number[] = [
  0, 1, 7, 10, 13, 14, 16, 17, 23, 29, 30, 32, 36, 39, 43, 47, 51, 53, 58, 59,
];
