import { describe, expect, it } from "vitest";
import { estimatedNpsImpact, tdsDifference } from "./tax";

describe("prototype tax calculations", () => {
  it("caps a potential NPS estimate at the prototype limit", () => {
    expect(estimatedNpsImpact(70_000)).toBe(10_400);
  });

  it("calculates a visible TDS difference", () => {
    expect(tdsDifference(142_000, 132_000)).toBe(10_000);
  });
});
