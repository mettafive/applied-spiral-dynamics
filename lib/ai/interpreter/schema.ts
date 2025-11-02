import { z } from "zod";

// Spiral Dynamics color stage scoring
const colorStageSchema = z.object({
  beige: z.number().min(-1).max(1).describe("Survival, instinct"),
  purple: z.number().min(-1).max(1).describe("Tribal, magical thinking"),
  red: z.number().min(-1).max(1).describe("Power, impulsivity, ego"),
  blue: z.number().min(-1).max(1).describe("Order, rules, tradition"),
  orange: z.number().min(-1).max(1).describe("Achievement, innovation"),
  green: z.number().min(-1).max(1).describe("Equality, empathy"),
  yellow: z.number().min(-1).max(1).describe("Systemic, integrative"),
  turquoise: z.number().min(-1).max(1).describe("Holistic, lived experience"),
  coral: z.number().min(-1).max(1).describe("Radical authenticity"),
  teal: z.number().min(-1).max(1).describe("Systematic inner purification"),
});

// Successful pixel extraction
const pixelExtractionSchema = z.object({
  pixel: z.object({
    statement: z.string().describe("Clear, concise belief statement"),
    context: z
      .string()
      .describe("Context explaining when/why this belief arose"),
    explanation: z.string().describe("Why this belief maps to these SD stages"),
    color_stage: colorStageSchema,
    confidence_score: z
      .number()
      .min(0.1)
      .max(1.0)
      .describe("0.1 (tentative) to 1.0 (absolute)"),
    too_nuanced: z
      .boolean()
      .describe("True if belief is too complex/vague to extract"),
    absolute_thinking: z
      .boolean()
      .describe("True if belief uses always/never language"),
  }),
});

// No pixel extracted
const noPixelSchema = z.object({
  no_pixel: z.literal(true),
  reason: z.string().describe("Why no pixel was extracted"),
});

// Union type for interpreter output
export const interpreterOutputSchema = z.union([
  pixelExtractionSchema,
  noPixelSchema,
]);

export type InterpreterOutput = z.infer<typeof interpreterOutputSchema>;
export type PixelExtraction = Extract<InterpreterOutput, { pixel: unknown }>;
export type NoPixel = Extract<InterpreterOutput, { no_pixel: true }>;
export type ColorStage = z.infer<typeof colorStageSchema>;
