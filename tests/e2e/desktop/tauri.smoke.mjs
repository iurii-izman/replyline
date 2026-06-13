/* global describe, it, browser */

describe("tauri desktop artifact smoke", () => {
  it("launches the desktop artifact and creates a webdriver session", async () => {
    const handle = await browser.getWindowHandle();
    if (!handle || handle.length === 0) {
      throw new Error("Expected a valid window handle");
    }
  });

  it("accepts minimal keyboard input without losing the session", async () => {
    await browser.keys(["r"]);
    const stillAlive = await browser.getWindowHandle();
    if (!stillAlive) {
      throw new Error("Session became unavailable after keyboard input");
    }
  });
});
