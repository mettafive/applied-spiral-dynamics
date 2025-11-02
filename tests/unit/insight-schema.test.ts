import { describe, expect, it } from "vitest";
import {
  confidenceAdjustmentSchema,
  type InsightOutput,
  insightOutputSchema,
} from "@/lib/ai/insight/schema";

describe("Insight Schema", () => {
  describe("Confidence Adjustment Schema", () => {
    it("should accept valid confidence adjustment", () => {
      const valid = {
        pixel_id: "550e8400-e29b-41d4-a716-446655440000",
        new_score: 0.75,
        reason: "User expressed doubt about this belief",
      };

      const result = confidenceAdjustmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject non-UUID pixel_id", () => {
      const invalid = {
        pixel_id: "not-a-uuid",
        new_score: 0.75,
        reason: "Test",
      };

      const result = confidenceAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject score outside 0-1 range", () => {
      const invalid = {
        pixel_id: "550e8400-e29b-41d4-a716-446655440000",
        new_score: 1.5,
        reason: "Test",
      };

      const result = confidenceAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Insight Output Schema", () => {
    it("should accept valid insight output", () => {
      const validInsight: InsightOutput = {
        guidance:
          "User showing Orange-Green tension. Ask about cost of achievement drive.",
        context_summary:
          "Strong Orange achievement orientation with emerging Green values.",
        confidence_adjustments: [
          {
            pixel_id: "550e8400-e29b-41d4-a716-446655440000",
            new_score: 0.6,
            reason: "User questioning this belief",
          },
        ],
        pixels_to_archive: [],
        suggested_question:
          "What would success look like if it didn't require exhaustion?",
      };

      const result = insightOutputSchema.safeParse(validInsight);
      expect(result.success).toBe(true);
    });

    it("should accept insight without optional suggested_question", () => {
      const validInsight: InsightOutput = {
        guidance: "Continue natural conversation",
        context_summary: "No clear developmental tensions",
        confidence_adjustments: [],
        pixels_to_archive: [],
      };

      const result = insightOutputSchema.safeParse(validInsight);
      expect(result.success).toBe(true);
    });

    it("should reject insight missing required fields", () => {
      const invalid = {
        guidance: "Test",
        // Missing context_summary, confidence_adjustments, pixels_to_archive
      };

      const result = insightOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should accept empty arrays for adjustments and archives", () => {
      const valid: InsightOutput = {
        guidance: "Test",
        context_summary: "Test",
        confidence_adjustments: [],
        pixels_to_archive: [],
      };

      const result = insightOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid pixel IDs in archive list", () => {
      const invalid = {
        guidance: "Test",
        context_summary: "Test",
        confidence_adjustments: [],
        pixels_to_archive: ["not-a-uuid"],
      };

      const result = insightOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should accept multiple confidence adjustments", () => {
      const valid: InsightOutput = {
        guidance: "Test",
        context_summary: "Test",
        confidence_adjustments: [
          {
            pixel_id: "550e8400-e29b-41d4-a716-446655440000",
            new_score: 0.8,
            reason: "Reaffirmed",
          },
          {
            pixel_id: "550e8400-e29b-41d4-a716-446655440001",
            new_score: 0.3,
            reason: "Questioned",
          },
        ],
        pixels_to_archive: [],
      };

      const result = insightOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept multiple pixels to archive", () => {
      const valid: InsightOutput = {
        guidance: "Test",
        context_summary: "Test",
        confidence_adjustments: [],
        pixels_to_archive: [
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001",
        ],
      };

      const result = insightOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
