import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      SF_CLIENT_ID: "test-client-id",
      SF_CLIENT_SECRET: "test-client-secret",
      SESSION_SECRET: "test-session-secret",
      DB_PATH: ":memory:",
    },
  },
});
