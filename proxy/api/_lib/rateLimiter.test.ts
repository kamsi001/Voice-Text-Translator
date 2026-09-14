/**
 * Unit tests for the per-IP sliding-window `RateLimiter` and `clientIp`
 * extraction. Uses Vitest fake timers to exercise window rollover
 * deterministically (the limiter reads `Date.now()`).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest } from "@vercel/node";
import {
  RateLimiter,
  clientIp,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_WINDOW_MS,
} from "./rateLimiter.js";

describe("RateLimiter.allow — under the limit", () => {
  it("admits every request while the count stays below max", () => {
    const max = 5;
    const limiter = new RateLimiter(max, DEFAULT_WINDOW_MS);
    for (let i = 0; i < max; i++) {
      expect(limiter.allow("1.1.1.1")).toBe(true);
    }
  });

  it("tracks each IP independently", () => {
    const limiter = new RateLimiter(2, DEFAULT_WINDOW_MS);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    // "a" is now at its limit, but "b" has its own budget.
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
    expect(limiter.allow("b")).toBe(true);
    expect(limiter.allow("b")).toBe(false);
  });
});

describe("RateLimiter.allow — at the limit (429 boundary)", () => {
  it("rejects the request that would exceed max within the window", () => {
    const max = 3;
    const limiter = new RateLimiter(max, DEFAULT_WINDOW_MS);
    // The first `max` requests are admitted.
    for (let i = 0; i < max; i++) {
      expect(limiter.allow("2.2.2.2")).toBe(true);
    }
    // The next one crosses the boundary and is rejected.
    expect(limiter.allow("2.2.2.2")).toBe(false);
    // Still rejected while the window has not advanced.
    expect(limiter.allow("2.2.2.2")).toBe(false);
  });

  it("applies the documented defaults (60 requests / 60s)", () => {
    const limiter = new RateLimiter(DEFAULT_MAX_REQUESTS, DEFAULT_WINDOW_MS);
    for (let i = 0; i < DEFAULT_MAX_REQUESTS; i++) {
      expect(limiter.allow("3.3.3.3")).toBe(true);
    }
    expect(limiter.allow("3.3.3.3")).toBe(false);
  });
});

describe("RateLimiter.allow — window rollover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("admits requests again once the window has fully elapsed", () => {
    const max = 2;
    const windowMs = 60_000;
    const limiter = new RateLimiter(max, windowMs);

    expect(limiter.allow("4.4.4.4")).toBe(true);
    expect(limiter.allow("4.4.4.4")).toBe(true);
    // At the limit within the same instant.
    expect(limiter.allow("4.4.4.4")).toBe(false);

    // Advance past the window so the earlier timestamps fall outside it.
    vi.advanceTimersByTime(windowMs + 1);
    expect(limiter.allow("4.4.4.4")).toBe(true);
    expect(limiter.allow("4.4.4.4")).toBe(true);
    expect(limiter.allow("4.4.4.4")).toBe(false);
  });

  it("slides continuously: an old hit expires while a newer one remains", () => {
    const max = 2;
    const windowMs = 60_000;
    const limiter = new RateLimiter(max, windowMs);

    // t=0: first hit.
    expect(limiter.allow("5.5.5.5")).toBe(true);

    // t=30s: second hit — now at the limit.
    vi.advanceTimersByTime(30_000);
    expect(limiter.allow("5.5.5.5")).toBe(true);
    expect(limiter.allow("5.5.5.5")).toBe(false);

    // t=60.001s: the t=0 hit is now outside the window, but the t=30s hit
    // is still inside it, so exactly one slot frees up.
    vi.advanceTimersByTime(30_001);
    expect(limiter.allow("5.5.5.5")).toBe(true);
    // The t=30s and t=60s hits fill the window again.
    expect(limiter.allow("5.5.5.5")).toBe(false);
  });

  it("does not free a slot before the window elapses", () => {
    const max = 1;
    const windowMs = 60_000;
    const limiter = new RateLimiter(max, windowMs);

    expect(limiter.allow("6.6.6.6")).toBe(true);
    // Just short of the full window: still blocked.
    vi.advanceTimersByTime(windowMs - 1);
    expect(limiter.allow("6.6.6.6")).toBe(false);
    // One tick past the window: admitted again.
    vi.advanceTimersByTime(2);
    expect(limiter.allow("6.6.6.6")).toBe(true);
  });
});

describe("clientIp", () => {
  function reqWith(fwd: string | string[] | undefined): VercelRequest {
    return { headers: { "x-forwarded-for": fwd } } as unknown as VercelRequest;
  }

  it("returns the first (client-most) entry of a comma-separated header", () => {
    expect(clientIp(reqWith("9.9.9.9, 10.0.0.1, 172.16.0.1"))).toBe("9.9.9.9");
  });

  it("trims surrounding whitespace from the extracted IP", () => {
    expect(clientIp(reqWith("  9.9.9.9 , 10.0.0.1"))).toBe("9.9.9.9");
  });

  it("uses the first element when the header is an array", () => {
    expect(clientIp(reqWith(["8.8.8.8", "1.1.1.1"]))).toBe("8.8.8.8");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    expect(clientIp(reqWith(undefined))).toBe("unknown");
  });
});
