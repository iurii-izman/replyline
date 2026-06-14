function normalizeHotkeyKey(key: string): string | null {
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (key.startsWith("Arrow")) return key.replace("Arrow", "");
  if (["Tab", "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown"].includes(key))
    return key;
  return null;
}

export function formatHotkeyFromEvent(ev: KeyboardEvent): string | null {
  const key = normalizeHotkeyKey(ev.key);
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push("Ctrl");
  if (ev.altKey) parts.push("Alt");
  if (ev.shiftKey) parts.push("Shift");
  if (ev.metaKey) parts.push("Meta");
  if (key && !["Control", "Alt", "Shift", "Meta"].includes(key)) {
    parts.push(key);
  }
  return parts.length >= 2 ? parts.join("+") : null;
}
