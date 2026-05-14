/* global describe, it, browser */

describe('tauri desktop smoke', () => {
  it('creates a desktop webdriver session', async () => {
    const handle = await browser.getWindowHandle();
    if (!handle || handle.length === 0) {
      throw new Error('Expected a valid window handle');
    }
  });

  it('accepts keyboard input without crashing', async () => {
    await browser.keys(['r']);
    const stillAlive = await browser.getWindowHandle();
    if (!stillAlive) {
      throw new Error('Session became unavailable after keyboard input');
    }
  });
});
