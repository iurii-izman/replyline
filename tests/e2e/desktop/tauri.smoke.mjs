/* global console */
import process from 'node:process';
import { remote } from 'webdriverio';

const port = Number(process.env.TAURI_DRIVER_PORT ?? '4444');
const appPath = process.env.TAURI_APP_PATH;

if (!appPath) {
  console.error('TAURI_APP_PATH is required for desktop smoke test');
  process.exit(2);
}

const browser = await remote({
  hostname: '127.0.0.1',
  port,
  path: '/',
  capabilities: {
    browserName: 'wry',
    'tauri:options': { application: appPath }
  }
});

try {
  const title = await browser.getTitle();
  console.log(`Desktop title: ${title}`);
} finally {
  await browser.deleteSession();
}
