import { describe, expect, it } from "vitest";
import { boardLayout } from "./card";

describe("boardLayout", () => {
  it("판은 판 크기와 무관하게 같은 안쪽 영역을 채운다", () => {
    for (const size of [5, 7, 10]) {
      const { cell, originX, plate } = boardLayout(size);
      expect(cell * size).toBeCloseTo(720);
      expect(originX).toBeGreaterThan(plate.x);
      expect(originX + cell * size).toBeLessThan(plate.x + plate.w);
    }
  });
});
