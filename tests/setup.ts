import { config } from "dotenv";
import { beforeAll, vi } from "vitest";

// Load test environment variables
beforeAll(() => {
  config({ path: ".env.local" });

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, "log").mockImplementation(() => {
    /* intentionally empty */
  });
  vi.spyOn(console, "warn").mockImplementation(() => {
    /* intentionally empty */
  });
  // Keep errors visible for debugging
  // vi.spyOn(console, 'error').mockImplementation(() => {});
});
