import type { Setter } from "solid-js";

type NoticeTone = "info" | "error";
type NoticeValue = { tone: NoticeTone; message: string } | null;

export interface NoticeApi {
  pushNotice: (next: { tone: NoticeTone; message: string }, durationMs?: number) => void;
  dismissNotice: () => void;
  clearNoticeTimer: () => void;
}

export function createNotices(setNotice: Setter<NoticeValue>): NoticeApi {
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearNoticeTimer() {
    if (!noticeTimer) return;
    clearTimeout(noticeTimer);
    noticeTimer = null;
  }

  function pushNotice(
    next: { tone: NoticeTone; message: string },
    durationMs = 2800,
  ) {
    clearNoticeTimer();
    setNotice(next);
    noticeTimer = setTimeout(() => {
      setNotice(null);
      noticeTimer = null;
    }, durationMs);
  }

  function dismissNotice() {
    clearNoticeTimer();
    setNotice(null);
  }

  return { pushNotice, dismissNotice, clearNoticeTimer };
}
