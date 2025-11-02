import { ChatSDKError } from "./errors";
import type { ChatMessage } from "./types";
import { getTextFromMessage } from "./utils";

export const MESSAGE_LIMITS = {
  MAX_LENGTH: 10_000, // 10k characters
  MAX_PARTS: 10,
  MAX_ATTACHMENTS: 5,
} as const;

export const INPUT_LIMITS = {
  MAX_CHAT_TITLE_LENGTH: 200,
  MAX_DOCUMENT_TITLE_LENGTH: 200,
  MAX_SUGGESTION_LENGTH: 500,
} as const;

/**
 * Validates a user message before processing
 * Throws ChatSDKError if validation fails
 */
export function validateMessageInput(message: ChatMessage): void {
  if (!message || typeof message !== "object") {
    throw new ChatSDKError("bad_request:api", "Invalid message format");
  }

  if (!message.id || typeof message.id !== "string") {
    throw new ChatSDKError("bad_request:api", "Message must have a valid ID");
  }

  if (!message.parts || !Array.isArray(message.parts)) {
    throw new ChatSDKError(
      "bad_request:api",
      "Message must have a parts array"
    );
  }

  if (message.parts.length === 0) {
    throw new ChatSDKError("bad_request:api", "Message cannot be empty");
  }

  if (message.parts.length > MESSAGE_LIMITS.MAX_PARTS) {
    throw new ChatSDKError(
      "bad_request:api",
      `Message has too many parts (max ${MESSAGE_LIMITS.MAX_PARTS})`
    );
  }

  // Validate text content length
  const textContent = getTextFromMessage(message);

  if (textContent.length === 0) {
    throw new ChatSDKError(
      "bad_request:api",
      "Message must contain text content"
    );
  }

  if (textContent.length > MESSAGE_LIMITS.MAX_LENGTH) {
    throw new ChatSDKError(
      "bad_request:api",
      `Message exceeds maximum length of ${MESSAGE_LIMITS.MAX_LENGTH} characters (got ${textContent.length})`
    );
  }

  // Check for potential XSS/injection attempts
  validateTextContent(textContent);
}

// Regex patterns for validation (defined at top level for performance)
const REPEATED_CHARS_REGEX = /(.)\1{50,}/;
const WHITESPACE_SPLIT_REGEX = /\s+/;

/**
 * Validates text content for suspicious patterns
 */
function validateTextContent(text: string): void {
  // Check for excessively repeated characters (potential DoS)
  if (REPEATED_CHARS_REGEX.test(text)) {
    throw new ChatSDKError(
      "bad_request:api",
      "Message contains suspicious repeated characters"
    );
  }

  // Check for extremely long words (potential buffer overflow attempts)
  const words = text.split(WHITESPACE_SPLIT_REGEX);
  for (const word of words) {
    if (word.length > 500) {
      throw new ChatSDKError(
        "bad_request:api",
        "Message contains suspiciously long word"
      );
    }
  }
}

/**
 * Validates a chat title
 */
export function validateChatTitle(title: string): void {
  if (typeof title !== "string") {
    throw new ChatSDKError("bad_request:api", "Title must be a string");
  }

  if (title.length === 0) {
    throw new ChatSDKError("bad_request:api", "Title cannot be empty");
  }

  if (title.length > INPUT_LIMITS.MAX_CHAT_TITLE_LENGTH) {
    throw new ChatSDKError(
      "bad_request:api",
      `Title exceeds maximum length of ${INPUT_LIMITS.MAX_CHAT_TITLE_LENGTH} characters`
    );
  }
}

/**
 * Validates a document title
 */
export function validateDocumentTitle(title: string): void {
  if (typeof title !== "string") {
    throw new ChatSDKError("bad_request:api", "Title must be a string");
  }

  if (title.length === 0) {
    throw new ChatSDKError("bad_request:api", "Title cannot be empty");
  }

  if (title.length > INPUT_LIMITS.MAX_DOCUMENT_TITLE_LENGTH) {
    throw new ChatSDKError(
      "bad_request:api",
      `Title exceeds maximum length of ${INPUT_LIMITS.MAX_DOCUMENT_TITLE_LENGTH} characters`
    );
  }
}

// Regex to remove control characters (intentional for security)
// biome-ignore lint/suspicious/noControlCharactersInRegex: Security feature to sanitize input
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const NORMALIZE_WHITESPACE_REGEX = /\s+/g;

/**
 * Sanitizes a string for safe display
 * Removes control characters and normalizes whitespace
 */
export function sanitizeDisplayString(input: string): string {
  // Remove control characters except \n, \r, \t
  const withoutControl = input.replace(CONTROL_CHARS_REGEX, "");

  // Normalize whitespace
  return withoutControl.trim().replace(NORMALIZE_WHITESPACE_REGEX, " ");
}
