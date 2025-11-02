import { describe, expect, it } from "vitest";
import {
  type ColorStage,
  type InterpreterOutput,
  interpreterOutputSchema,
} from "@/lib/ai/interpreter/schema";

describe("Interpreter Schema", () => {
  describe("Color Stage Schema", () => {
    it("should accept valid color stage scores", () => {
      const validColorStage: ColorStage = {
        beige: 0,
        purple: 0.5,
        red: -0.3,
        blue: 0.8,
        orange: 0.9,
        green: -0.2,
        yellow: 0,
        turquoise: 0.1,
        coral: 0,
        teal: 0,
      };

      const result = interpreterOutputSchema.safeParse({
        pixel: {
          statement: "Test belief",
          context: "Test context",
          explanation: "Test explanation",
          color_stage: validColorStage,
          confidence_score: 0.7,
          too_nuanced: false,
          absolute_thinking: false,
        },
      });

      expect(result.success).toBe(true);
    });

    it("should reject color stage scores outside -1 to 1 range", () => {
      const invalidColorStage = {
        beige: 1.5, // Invalid: > 1
        purple: 0,
        red: 0,
        blue: 0,
        orange: 0,
        green: 0,
        yellow: 0,
        turquoise: 0,
        coral: 0,
        teal: 0,
      };

      const result = interpreterOutputSchema.safeParse({
        pixel: {
          statement: "Test belief",
          context: "Test context",
          explanation: "Test explanation",
          color_stage: invalidColorStage,
          confidence_score: 0.7,
          too_nuanced: false,
          absolute_thinking: false,
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Pixel Extraction Schema", () => {
    it("should accept valid pixel extraction", () => {
      const validPixel: InterpreterOutput = {
        pixel: {
          statement: "Hard work always pays off",
          context: "Discussing career success",
          explanation: "Orange achievement orientation",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0.3,
            orange: 0.9,
            green: 0,
            yellow: 0,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.85,
          too_nuanced: false,
          absolute_thinking: true,
        },
      };

      const result = interpreterOutputSchema.safeParse(validPixel);
      expect(result.success).toBe(true);
    });

    it("should reject pixel with confidence score outside range", () => {
      const invalidPixel = {
        pixel: {
          statement: "Test",
          context: "Test",
          explanation: "Test",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0,
            orange: 0,
            green: 0,
            yellow: 0,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 1.5, // Invalid: > 1.0
          too_nuanced: false,
          absolute_thinking: false,
        },
      };

      const result = interpreterOutputSchema.safeParse(invalidPixel);
      expect(result.success).toBe(false);
    });

    it("should reject pixel with missing required fields", () => {
      const incompletePixel = {
        pixel: {
          statement: "Test",
          // Missing context, explanation, color_stage, etc.
        },
      };

      const result = interpreterOutputSchema.safeParse(incompletePixel);
      expect(result.success).toBe(false);
    });
  });

  describe("No Pixel Schema", () => {
    it("should accept valid no_pixel response", () => {
      const validNoPixel: InterpreterOutput = {
        no_pixel: true,
        reason: "Message was a question, not a belief statement",
      };

      const result = interpreterOutputSchema.safeParse(validNoPixel);
      expect(result.success).toBe(true);
    });

    it("should reject no_pixel without reason", () => {
      const invalidNoPixel = {
        no_pixel: true,
        // Missing reason
      };

      const result = interpreterOutputSchema.safeParse(invalidNoPixel);
      expect(result.success).toBe(false);
    });

    it("should reject no_pixel with false value", () => {
      const invalidNoPixel = {
        no_pixel: false,
        reason: "Test",
      };

      const result = interpreterOutputSchema.safeParse(invalidNoPixel);
      expect(result.success).toBe(false);
    });
  });

  describe("Union Schema", () => {
    it("should accept either pixel or no_pixel", () => {
      const pixelResult = interpreterOutputSchema.safeParse({
        pixel: {
          statement: "Test",
          context: "Test",
          explanation: "Test",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0,
            orange: 0,
            green: 0,
            yellow: 0,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.5,
          too_nuanced: false,
          absolute_thinking: false,
        },
      });

      const noPixelResult = interpreterOutputSchema.safeParse({
        no_pixel: true,
        reason: "Not a belief",
      });

      expect(pixelResult.success).toBe(true);
      expect(noPixelResult.success).toBe(true);
    });

    it("should reject object with both pixel and no_pixel", () => {
      const invalid = {
        pixel: {
          statement: "Test",
          context: "Test",
          explanation: "Test",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0,
            orange: 0,
            green: 0,
            yellow: 0,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.5,
          too_nuanced: false,
          absolute_thinking: false,
        },
        no_pixel: true,
        reason: "Conflicting",
      };

      const result = interpreterOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
