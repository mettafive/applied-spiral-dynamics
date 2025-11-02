import { z } from "zod";

export const confidenceAdjustmentSchema = z.object({
  pixel_id: z.string().uuid(),
  new_score: z.number().min(0).max(1),
  reason: z.string(),
});

export const insightOutputSchema = z.object({
  guidance: z
    .string()
    .describe(
      "Developmental guidance for Main LLM on how to respond. Explain stage tensions, transitions, and coaching approach."
    ),
  context_summary: z
    .string()
    .describe(
      "Brief summary of user's belief landscape based on activated pixels"
    ),
  confidence_adjustments: z
    .array(confidenceAdjustmentSchema)
    .describe(
      "Pixels whose confidence should change based on this interaction"
    ),
  pixels_to_archive: z
    .array(z.string().uuid())
    .describe("Pixel IDs to archive due to transcendence or aha moments"),
  suggested_question: z
    .string()
    .optional()
    .describe(
      "Optional question to help user see limitations or open next stage"
    ),
});

export type InsightOutput = z.infer<typeof insightOutputSchema>;
export type ConfidenceAdjustment = z.infer<typeof confidenceAdjustmentSchema>;
