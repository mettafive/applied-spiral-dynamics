import { describe, expect, it } from "vitest";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import {
  MESSAGE_LIMITS,
  sanitizeDisplayString,
  validateChatTitle,
  validateDocumentTitle,
  validateMessageInput,
} from "@/lib/validation";

describe("validateMessageInput", () => {
  it("should accept valid message", () => {
    const validMessage: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: [{ type: "text", text: "Hello world" }],
    };

    expect(() => validateMessageInput(validMessage)).not.toThrow();
  });

  it("should reject message without ID", () => {
    const invalidMessage = {
      role: "user",
      parts: [{ type: "text", text: "Hello" }],
    } as unknown as ChatMessage;

    expect(() => validateMessageInput(invalidMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(invalidMessage)).toThrow(
      "Message must have a valid ID"
    );
  });

  it("should reject message without parts", () => {
    const invalidMessage = {
      id: "test-id",
      role: "user",
    } as unknown as ChatMessage;

    expect(() => validateMessageInput(invalidMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(invalidMessage)).toThrow(
      "Message must have a parts array"
    );
  });

  it("should reject empty message", () => {
    const emptyMessage: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: [],
    };

    expect(() => validateMessageInput(emptyMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(emptyMessage)).toThrow(
      "Message cannot be empty"
    );
  });

  it("should reject message exceeding max length", () => {
    const longText = "a".repeat(MESSAGE_LIMITS.MAX_LENGTH + 1);
    const longMessage: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: [{ type: "text", text: longText }],
    };

    expect(() => validateMessageInput(longMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(longMessage)).toThrow(
      "Message exceeds maximum length"
    );
  });

  it("should reject message with too many parts", () => {
    const tooManyParts: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: Array.from({ length: MESSAGE_LIMITS.MAX_PARTS + 1 }, (_, i) => ({
        type: "text" as const,
        text: `Part ${i}`,
      })),
    };

    expect(() => validateMessageInput(tooManyParts)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(tooManyParts)).toThrow(
      "Message has too many parts"
    );
  });

  it("should reject message with suspicious repeated characters", () => {
    const suspiciousMessage: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: [{ type: "text", text: "a".repeat(60) }],
    };

    expect(() => validateMessageInput(suspiciousMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(suspiciousMessage)).toThrow(
      "suspicious repeated characters"
    );
  });

  it("should reject message with extremely long word", () => {
    const longWord = "a".repeat(501);
    const suspiciousMessage: ChatMessage = {
      id: "test-id",
      role: "user",
      parts: [{ type: "text", text: `Hello ${longWord} world` }],
    };

    expect(() => validateMessageInput(suspiciousMessage)).toThrow(ChatSDKError);
    expect(() => validateMessageInput(suspiciousMessage)).toThrow(
      "suspiciously long word"
    );
  });
});

describe("validateChatTitle", () => {
  it("should accept valid title", () => {
    expect(() => validateChatTitle("My Chat")).not.toThrow();
  });

  it("should reject empty title", () => {
    expect(() => validateChatTitle("")).toThrow(ChatSDKError);
    expect(() => validateChatTitle("")).toThrow("Title cannot be empty");
  });

  it("should reject non-string title", () => {
    expect(() => validateChatTitle(123 as unknown as string)).toThrow(
      ChatSDKError
    );
  });

  it("should reject title exceeding max length", () => {
    const longTitle = "a".repeat(201);
    expect(() => validateChatTitle(longTitle)).toThrow(ChatSDKError);
    expect(() => validateChatTitle(longTitle)).toThrow(
      "Title exceeds maximum length"
    );
  });
});

describe("validateDocumentTitle", () => {
  it("should accept valid document title", () => {
    expect(() => validateDocumentTitle("Document 1")).not.toThrow();
  });

  it("should reject empty document title", () => {
    expect(() => validateDocumentTitle("")).toThrow(ChatSDKError);
  });
});

describe("sanitizeDisplayString", () => {
  it("should remove control characters", () => {
    const input = "Hello\x00World\x1F";
    const output = sanitizeDisplayString(input);
    expect(output).toBe("HelloWorld");
  });

  it("should preserve newlines, tabs, carriage returns", () => {
    const input = "Line1\nLine2\tTabbed\rReturn";
    const output = sanitizeDisplayString(input);
    expect(output).toContain("\n");
    expect(output).toContain("\t");
  });

  it("should normalize whitespace", () => {
    const input = "Hello    World   Test";
    const output = sanitizeDisplayString(input);
    expect(output).toBe("Hello World Test");
  });

  it("should trim leading and trailing whitespace", () => {
    const input = "  Hello World  ";
    const output = sanitizeDisplayString(input);
    expect(output).toBe("Hello World");
  });
});
