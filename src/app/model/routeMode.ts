export function isConfiguredLlmRoute(baseUrl: string, model: string): boolean {
  return Boolean(baseUrl.trim() && model.trim());
}

export type LlmRouteMode = "local" | "cloud" | "unknown";

export function detectLlmRouteModeFromHost(host?: string | null): LlmRouteMode {
  const normalized = (host ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "localhost" || normalized.endsWith(".local")) return "local";
  if (normalized === "::1") return "local";
  const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const nums = ipv4Match.slice(1).map((v) => Number.parseInt(v, 10));
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return "cloud";
    const [a, b] = nums;
    if (a === 127 || a === 10) return "local";
    if (a === 192 && b === 168) return "local";
    if (a === 172 && b >= 16 && b <= 31) return "local";
    if (a === 169 && b === 254) return "local";
  }
  return "cloud";
}
