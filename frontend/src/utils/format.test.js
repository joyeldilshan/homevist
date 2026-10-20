import { describe, it, expect } from "vitest";
import { formatRating, formatRatingSummary } from "./format";

describe("formatRating", () => {
  it("never invents a score when there are no reviews", () => {
    for (const p of [undefined, null, {}, { rating: 0, totalRatings: 0 }, { rating: 4.8 }, { rating: 4.8, totalRatings: 0 }]) {
      expect(formatRating(p)).toBeNull();
      expect(formatRatingSummary(p)).toBe("No reviews yet");
    }
  });

  it("shows the real average once someone has rated", () => {
    expect(formatRating({ rating: 4.666, totalRatings: 3 })).toBe("4.7");
    expect(formatRatingSummary({ rating: 4.666, totalRatings: 3 })).toBe("⭐ 4.7 · 3 reviews");
    expect(formatRatingSummary({ rating: 5, totalRatings: 1 })).toBe("⭐ 5.0 · 1 review");
  });
});
