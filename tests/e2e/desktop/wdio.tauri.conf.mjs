/* global process */
if (!process.env.TAURI_APP_PATH) {
  throw new Error("TAURI_APP_PATH is required for desktop e2e");
}

// Desktop E2E is intentionally limited to artifact/session bring-up smoke, not full UX coverage.
export const config = {
  runner: "local",
  framework: "mocha",
  mochaOpts: { timeout: 60_000 },
  specs: ["./tauri.smoke.mjs"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: Number(process.env.TAURI_DRIVER_PORT ?? "4444"),
  path: "/",
  capabilities: [
    {
      browserName: "wry",
      "tauri:options": {
        application: process.env.TAURI_APP_PATH,
      },
    },
  ],
};
