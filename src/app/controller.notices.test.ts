import { describe, expect, it, vi } from "vitest";
import { createNotices } from "./controller/notices";

describe("createNotices", () => {
  it("shows notice then auto clears after timeout", async () => {
    vi.useFakeTimers();
    const setNotice = vi.fn();
    const notices = createNotices(setNotice as never);

    notices.pushNotice({ tone: "info", message: "saved" }, 1000);
    expect(setNotice).toHaveBeenCalledWith({ tone: "info", message: "saved" });

    vi.advanceTimersByTime(1000);
    expect(setNotice).toHaveBeenLastCalledWith(null);
    vi.useRealTimers();
  });

  it("dismiss clears current notice immediately", () => {
    vi.useFakeTimers();
    const setNotice = vi.fn();
    const notices = createNotices(setNotice as never);

    notices.pushNotice({ tone: "error", message: "oops" }, 5000);
    notices.dismissNotice();

    expect(setNotice).toHaveBeenLastCalledWith(null);
    vi.advanceTimersByTime(5000);
    expect(setNotice).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
