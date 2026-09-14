/**
 * Per-IP sliding-window rate limiter and client IP extraction. The limiter
 * runs at the front of the handler pipeline so an over-limit request is
 * rejected with 429 before validation or any provider (cost-incurring) call.
 */
import type { VercelRequest } from "@vercel/node";

/** Default request budget and window applied by {@link rateLimiter}. */
export const DEFAULT_MAX_REQUESTS = 60;
export const DEFAULT_WINDOW_MS = 60_000;

/**
 * Tracks recent request timestamps per client IP and allows a request only
 * when the count within the rolling window is below `maxRequests`. State is
 * in-memory and per-instance; it resets when the serverless instance recycles.
 */
export class RateLimiter {
  readonly #hits = new Map<string, number[]>();
  readonly #maxRequests: number;
  readonly #windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.#maxRequests = maxRequests;
    this.#windowMs = windowMs;
  }

  /**
   * Records the request for `ip` and returns whether it is within the limit.
   * Timestamps older than the window are pruned on every call, so the window
   * slides continuously rather than resetting on fixed boundaries.
   */
  allow(ip: string): boolean {
    const now = Date.now();
    const cutoff = now - this.#windowMs;
    const recent = (this.#hits.get(ip) ?? []).filter((t) => t > cutoff);

    if (recent.length >= this.#maxRequests) {
      this.#hits.set(ip, recent);
      return false;
    }

    recent.push(now);
    this.#hits.set(ip, recent);
    return true;
  }
}

/** Shared limiter used by the handler: 60 requests per rolling 60s per IP. */
export const rateLimiter = new RateLimiter(
  DEFAULT_MAX_REQUESTS,
  DEFAULT_WINDOW_MS,
);

/**
 * Extracts the originating client IP from the `x-forwarded-for` header set by
 * the platform edge. Uses the first (client-most) entry when a list is
 * present; falls back to `"unknown"` when the header is absent.
 */
export function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
  return "unknown";
}
