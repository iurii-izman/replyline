/* global process */
export const config = {
  runner: 'local',
  framework: 'mocha',
  mochaOpts: { timeout: 60_000 },
  specs: ['./tests/e2e/desktop/tauri.smoke.mjs'],
  hostname: '127.0.0.1',
  port: Number(process.env.TAURI_DRIVER_PORT ?? '4444'),
  path: '/'
};
