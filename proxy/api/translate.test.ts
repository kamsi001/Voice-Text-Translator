/**
 * Handler tests for Property 2 — "No cost without validation".
 *
 * The provider is the only cost-incurring step. These tests assert the
 * `/api/translate` handler invokes the provider ONLY when both the rate
 * limiter and the validator pass, and that the pipeline order is
 * rate limit → validation → provider. A spy provider is injected via
 * `getProvider` and a spy on the shared `rateLimiter.allow` controls the
 * rate-limit decision. Uses Vitest.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./translate.js";
import * as providerModule from "./_lib/provider.js";
import type { TranslationProvider } from "./_lib/provider.js";
import { rateLimiter } from "./_lib/rateLimiter.js";
import { MAX_TEXT_LENGTH } from "./_lib/contract.js";

/** A spy provider whose `translate` records calls and returns a valid shape. */
function spyProvider(): TranslationProvider & {
  translate: ReturnType<typeof vi.fn>;
} {
  const translate = vi.fn(async () => ({
    translation: "Hola",
    pronunciation: "OH-lah",
    context: "A casual greeting.",
  }));
  return { translate };
}

/** Minimal fake VercelResponse capturing the single status/body pair. */
function fakeRes(): VercelResponse & {
  statusCode: number | undefined;
  body: unknown;
  sendCount: number;
} {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    sendCount: 0,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.sendCount += 1;
      return this;
    },
    end() {
      this.sendCount += 1;
      return this;
    },
  };
  return res as unknown as VercelResponse & {
    statusCode: number | undefined;
    body: unknown;
    sendCount: number;
  };
}

function postReq(body: unknown): VercelRequest {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7" },
    body,
  } as unknown as VercelRequest;
}

let provider: ReturnType<typeof spyProvider>;

beforeEach(() => {
  provider = spyProvider();
  vi.spyOn(providerModule, "getProvider").mockReturnValue(provider);
  // A key must appear present so that, absent our getProvider spy, no
  // MissingConfigError path is exercised.
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
});

describe("Property 2 — provider is NOT invoked when rate-limited", () => {
  it("returns 429 and never calls the provider", async () => {
    vi.spyOn(rateLimiter, "allow").mockReturnValue(false);
    const res = fakeRes();

    await handler(postReq({ text: "hello", targetLanguage: "Spanish" }), res);

    expect(res.statusCode).toBe(429);
    expect(provider.translate).not.toHaveBeenCalled();
    expect(res.sendCount).toBe(1);
  });

  it("rejects on rate limit BEFORE validation runs (order: rate limit first)", async () => {
    vi.spyOn(rateLimiter, "allow").mockReturnValue(false);
    const res = fakeRes();

    // Body is ALSO invalid (over-length). If validation ran first we'd get
    // 400; because the rate limiter runs first we must get 429.
    await handler(
      postReq({
        text: "a".repeat(MAX_TEXT_LENGTH + 1),
        targetLanguage: "Klingon",
      }),
      res,
    );

    expect(res.statusCode).toBe(429);
    expect(provider.translate).not.toHaveBeenCalled();
  });
});

describe("Property 2 — provider is NOT invoked when validation fails", () => {
  beforeEach(() => {
    // Rate limit passes so validation is the gate under test.
    vi.spyOn(rateLimiter, "allow").mockReturnValue(true);
  });

  it("over-length text is rejected 400 without calling the provider", async () => {
    const res = fakeRes();

    await handler(
      postReq({
        text: "a".repeat(MAX_TEXT_LENGTH + 1),
        targetLanguage: "Spanish",
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(provider.translate).not.toHaveBeenCalled();
    expect(res.sendCount).toBe(1);
  });

  it("unsupported language is rejected 400 without calling the provider", async () => {
    const res = fakeRes();

    await handler(postReq({ text: "hello", targetLanguage: "Klingon" }), res);

    expect(res.statusCode).toBe(400);
    expect(provider.translate).not.toHaveBeenCalled();
    expect(res.sendCount).toBe(1);
  });

  it("empty text is rejected 400 without calling the provider", async () => {
    const res = fakeRes();

    await handler(postReq({ text: "   ", targetLanguage: "Spanish" }), res);

    expect(res.statusCode).toBe(400);
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it("a non-object body is rejected 400 without calling the provider", async () => {
    const res = fakeRes();

    await handler(postReq("not an object"), res);

    expect(res.statusCode).toBe(400);
    expect(provider.translate).not.toHaveBeenCalled();
  });
});

describe("Property 2 — provider IS invoked only when both gates pass", () => {
  it("calls the provider exactly once with the validated text and language", async () => {
    vi.spyOn(rateLimiter, "allow").mockReturnValue(true);
    const res = fakeRes();

    await handler(
      postReq({ text: "  hello  ", targetLanguage: "spanish" }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(provider.translate).toHaveBeenCalledTimes(1);
    // Validated (trimmed) text and canonical language are forwarded.
    expect(provider.translate).toHaveBeenCalledWith("hello", "Spanish");
  });

  it("does not reach the provider for a non-POST method", async () => {
    const res = fakeRes();
    const req = {
      method: "GET",
      headers: {},
    } as unknown as VercelRequest;

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(provider.translate).not.toHaveBeenCalled();
  });
});
