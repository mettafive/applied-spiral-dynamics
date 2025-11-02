import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PixelExtraction } from "@/lib/ai/interpreter/schema";
import {
  isPixelExtraction,
  runInterpreterParallel,
} from "@/lib/ai/interpreter/service";

// Mock the generateObject function from AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
  embed: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

describe("Pixel Lifecycle Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Pixel Extraction", () => {
    it("should extract pixel from belief statement", async () => {
      const { generateObject } = await import("ai");

      // Mock successful pixel extraction
      const mockPixelOutput: PixelExtraction = {
        pixel: {
          statement: "Hard work always pays off",
          context: "Discussing career success and achievement",
          explanation:
            "Strong Orange achievement orientation with Blue work ethic",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0.1,
            blue: 0.4,
            orange: 0.9,
            green: 0,
            yellow: -0.2,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.85,
          too_nuanced: false,
          absolute_thinking: true,
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: mockPixelOutput,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "I truly believe that hard work always pays off",
        userId: "test-user",
      });

      expect(isPixelExtraction(result)).toBe(true);
      if (isPixelExtraction(result)) {
        expect(result.pixel.statement).toBe("Hard work always pays off");
        expect(result.pixel.color_stage.orange).toBeGreaterThan(0.8);
        expect(result.pixel.absolute_thinking).toBe(true);
        expect(result.pixel.confidence_score).toBeGreaterThan(0.7);
      }
    });

    it("should not extract pixel from question", async () => {
      const { generateObject } = await import("ai");

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          no_pixel: true,
          reason: "Message is a question, not a belief statement",
        },
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "What do you think about hard work?",
        userId: "test-user",
      });

      expect(isPixelExtraction(result)).toBe(false);
      if (!isPixelExtraction(result)) {
        expect(result.no_pixel).toBe(true);
        expect(result.reason).toContain("question");
      }
    });

    it("should not extract pixel from factual statement", async () => {
      const { generateObject } = await import("ai");

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          no_pixel: true,
          reason: "Factual statement without belief content",
        },
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "The sky is blue",
        userId: "test-user",
      });

      expect(isPixelExtraction(result)).toBe(false);
    });

    it("should handle callback when pixel extracted", async () => {
      const { generateObject } = await import("ai");

      const mockPixelOutput: PixelExtraction = {
        pixel: {
          statement: "Success requires sacrifice",
          context: "Test context",
          explanation: "Test explanation",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0.3,
            orange: 0.8,
            green: 0,
            yellow: 0,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.7,
          too_nuanced: false,
          absolute_thinking: false,
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: mockPixelOutput,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const mockCallback = vi.fn();

      const result = await runInterpreterParallel({
        userMessage: "I believe success requires sacrifice",
        userId: "test-user",
        onPixelExtracted: mockCallback,
      });

      expect(isPixelExtraction(result)).toBe(true);
      expect(mockCallback).toHaveBeenCalledOnce();
      expect(mockCallback).toHaveBeenCalledWith(mockPixelOutput);
    });

    it("should not call callback when no pixel extracted", async () => {
      const { generateObject } = await import("ai");

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          no_pixel: true,
          reason: "Question, not belief",
        },
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        warnings: undefined,
      });

      const mockCallback = vi.fn();

      await runInterpreterParallel({
        userMessage: "What do you think?",
        userId: "test-user",
        onPixelExtracted: mockCallback,
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("Spiral Dynamics Stage Detection", () => {
    it("should detect Blue stage (order, rules)", async () => {
      const { generateObject } = await import("ai");

      const bluePixel: PixelExtraction = {
        pixel: {
          statement: "There is a right way to do things",
          context: "Discussing procedures",
          explanation: "Blue order and structure",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0.9,
            orange: 0.3,
            green: -0.1,
            yellow: -0.3,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.8,
          too_nuanced: false,
          absolute_thinking: true,
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: bluePixel,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "I believe there is a right way to do things",
        userId: "test-user",
      });

      if (isPixelExtraction(result)) {
        expect(result.pixel.color_stage.blue).toBeGreaterThan(0.7);
        expect(result.pixel.absolute_thinking).toBe(true);
      }
    });

    it("should detect Green stage (equality, empathy)", async () => {
      const { generateObject } = await import("ai");

      const greenPixel: PixelExtraction = {
        pixel: {
          statement: "Everyone deserves to be heard equally",
          context: "Team discussion",
          explanation: "Green egalitarian perspective",
          color_stage: {
            beige: 0,
            purple: 0,
            red: -0.3,
            blue: 0,
            orange: -0.4,
            green: 0.95,
            yellow: 0.2,
            turquoise: 0,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.75,
          too_nuanced: false,
          absolute_thinking: false,
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: greenPixel,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "I think everyone deserves to be heard equally",
        userId: "test-user",
      });

      if (isPixelExtraction(result)) {
        expect(result.pixel.color_stage.green).toBeGreaterThan(0.8);
      }
    });

    it("should detect Yellow stage (systemic thinking)", async () => {
      const { generateObject } = await import("ai");

      const yellowPixel: PixelExtraction = {
        pixel: {
          statement: "Different approaches work in different contexts",
          context: "Problem-solving discussion",
          explanation: "Yellow systemic perspective",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: -0.3,
            orange: 0.1,
            green: 0.2,
            yellow: 0.85,
            turquoise: 0.3,
            coral: 0,
            teal: 0,
          },
          confidence_score: 0.65,
          too_nuanced: false,
          absolute_thinking: false,
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: yellowPixel,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const result = await runInterpreterParallel({
        userMessage: "I think different approaches work in different contexts",
        userId: "test-user",
      });

      if (isPixelExtraction(result)) {
        expect(result.pixel.color_stage.yellow).toBeGreaterThan(0.7);
        expect(result.pixel.absolute_thinking).toBe(false);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle LLM failure gracefully", async () => {
      const { generateObject } = await import("ai");

      vi.mocked(generateObject).mockRejectedValueOnce(
        new Error("LLM API error")
      );

      const result = await runInterpreterParallel({
        userMessage: "Test message",
        userId: "test-user",
      });

      expect(result).toEqual({
        no_pixel: true,
        reason: "Processing failed",
      });
    });

    it("should handle callback errors gracefully", async () => {
      const { generateObject } = await import("ai");

      const mockPixelOutput: PixelExtraction = {
        pixel: {
          statement: "Test",
          context: "Test",
          explanation: "Test",
          color_stage: {
            beige: 0,
            purple: 0,
            red: 0,
            blue: 0,
            orange: 0.5,
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
      };

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: mockPixelOutput,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: undefined,
      });

      const failingCallback = vi.fn().mockRejectedValue(new Error("DB error"));

      // Should not throw even if callback fails
      await expect(
        runInterpreterParallel({
          userMessage: "Test",
          userId: "test-user",
          onPixelExtracted: failingCallback,
        })
      ).resolves.toBeDefined();
    });
  });
});
