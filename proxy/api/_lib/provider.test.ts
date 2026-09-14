/**
 * Unit + property tests for `GeminiProvider` and the `TranslationProvider`
 * abstraction (task 2.5).
 *
 * These tests mock the global `fetch` so no network call is made. They assert:
 *  - the request body carries the correct prompt (target language + input text,
 *    strict-JSON instruction with the three contract keys),
 *  - the request body carries the correct `responseSchema` (OBJECT with three
 *    required STRING keys) and `responseMimeType: "application/json"`
 *    (Requirement 6.4),
 *  - the parse path: JSON string inside `candidates[0].content.parts[0].text`
 *    is returned parsed,
 *  - a non-OK HTTP response causes `translate` to throw (Requirement 8.6),
 *  - the API key is placed on the request URL and never leaked in errors.
 *
 * Property 7 (provider swappability): callers depend ONLY on
 * `TranslationProvider.translate`, so a drop-in provider is interchangeable.
 * **Validates: Requirements 6.1, 6.3**
 *
 * Framework: Vitest. Property tests use fast-check.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import {
  GeminiProvider,
  type TranslationProvider,
} from "./provider.js";

/** The exact set of keys the contract / responseSchema must require. */
const CONTRACT_KEYS = ["translation", "pronunciation", "context"] as const;

/** Build a Gemini-shaped OK response whose candidate text is `jsonText`. */
function geminiOkResponse(jsonText: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: jsonText }] } }],
    }),
  } as unknown as Response;
}

/** Build a non-OK HTTP response with the given status. */
function geminiErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

/** Install a `fetch` mock returning `response`; returns the spy for assertions. */
function mockFetch(response: Response) {
  const spy = vi.fn(async () => response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Parse the request body passed to the mocked fetch call. */
function parseRequestBody(spy: ReturnType<typeof vi.fn>) {
  expect(spy).toHaveBeenCalledTimes(1);
  const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
  expect(init.method).toBe("POST");
  return JSON.parse(init.body as string);
}

describe("GeminiProvider.translate — request body", () => {
  it("includes the target language and input text in the prompt", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({ translation: "Hola", pronunciation: "OH-lah", context: "greeting" }),
      ),
    );

    await new GeminiProvider("test-key").translate("good morning", "Spanish");

    const body = parseRequestBody(spy);
    const prompt = body.contents[0].parts[0].text as string;
    expect(prompt).toContain("Spanish");
    expect(prompt).toContain("good morning");
  });

  it("instructs the model to respond as strict JSON with the three contract keys", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({ translation: "Bonjour", pronunciation: "bohn-ZHOOR", context: "greeting" }),
      ),
    );

    await new GeminiProvider("test-key").translate("hello", "French");

    const prompt = parseRequestBody(spy).contents[0].parts[0].text as string;
    expect(prompt.toUpperCase()).toContain("JSON");
    for (const key of CONTRACT_KEYS) {
      expect(prompt).toContain(key);
    }
  });

  it("sets responseMimeType to application/json", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({ translation: "Hallo", pronunciation: "HAH-loh", context: "greeting" }),
      ),
    );

    await new GeminiProvider("test-key").translate("hi", "German");

    const body = parseRequestBody(spy);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("sets a responseSchema of OBJECT with three required STRING keys", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({ translation: "こんにちは", pronunciation: "kon-ni-chi-wa", context: "greeting" }),
      ),
    );

    await new GeminiProvider("test-key").translate("hello", "Japanese");

    const schema = parseRequestBody(spy).generationConfig.responseSchema;
    expect(schema.type).toBe("OBJECT");
    for (const key of CONTRACT_KEYS) {
      expect(schema.properties[key]).toEqual({ type: "STRING" });
    }
    expect([...schema.required].sort()).toEqual([...CONTRACT_KEYS].sort());
  });
});

describe("GeminiProvider.translate — parse path", () => {
  it("returns the object parsed from candidates[0].content.parts[0].text", async () => {
    const payload = {
      translation: "Hola",
      pronunciation: "OH-lah",
      context: "A casual greeting.",
    };
    mockFetch(geminiOkResponse(JSON.stringify(payload)));

    const result = await new GeminiProvider("test-key").translate("hello", "Spanish");

    expect(result).toEqual(payload);
  });
});

describe("GeminiProvider.translate — error handling", () => {
  it.each([400, 401, 403, 429, 500, 502, 503])(
    "throws when the HTTP response is non-OK (status %i)",
    async (status) => {
      mockFetch(geminiErrorResponse(status));
      await expect(
        new GeminiProvider("test-key").translate("hello", "Spanish"),
      ).rejects.toThrow();
    },
  );

  it("throws when the candidate text is missing", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    } as unknown as Response);

    await expect(
      new GeminiProvider("test-key").translate("hello", "Spanish"),
    ).rejects.toThrow();
  });

  it("throws when the candidate text is not valid JSON", async () => {
    mockFetch(geminiOkResponse("this is not json"));

    await expect(
      new GeminiProvider("test-key").translate("hello", "Spanish"),
    ).rejects.toThrow();
  });
});

describe("GeminiProvider.translate — API key handling", () => {
  it("passes the API key on the request URL", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({ translation: "Hola", pronunciation: "OH-lah", context: "greeting" }),
      ),
    );

    await new GeminiProvider("super-secret-key").translate("hello", "Spanish");

    const [url] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`key=${encodeURIComponent("super-secret-key")}`);
  });

  it("never leaks the API key in the thrown error on non-OK HTTP", async () => {
    const key = "super-secret-key";
    mockFetch(geminiErrorResponse(500));

    await expect(
      new GeminiProvider(key).translate("hello", "Spanish"),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(key),
      }),
    );
  });
});

describe("Property 7: Provider swappability", () => {
  // **Validates: Requirements 6.1, 6.3**
  //
  // A caller that depends ONLY on `TranslationProvider.translate` must work
  // with any conforming implementation. We define a trivial stub provider and
  // assert a generic caller drives it identically to GeminiProvider (same
  // interface, same return contract) across arbitrary inputs.

  /** Caller that depends solely on the interface — no concrete-type knowledge. */
  async function callThrough(
    provider: TranslationProvider,
    text: string,
    lang: string,
  ): Promise<unknown> {
    return provider.translate(text, lang);
  }

  it("drives any conforming provider through the same interface", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.string(), async (text, lang) => {
        const payload = { translation: text, pronunciation: "p", context: "c" };

        // Stub provider: an alternative implementation of the same interface.
        const stub: TranslationProvider = {
          translate: async (t, l) => ({ echoedText: t, echoedLang: l }),
        };
        const stubResult = await callThrough(stub, text, lang);
        expect(stubResult).toEqual({ echoedText: text, echoedLang: lang });

        // GeminiProvider: the default implementation, mocked at fetch.
        mockFetch(geminiOkResponse(JSON.stringify(payload)));
        const geminiResult = await callThrough(
          new GeminiProvider("test-key"),
          text,
          lang,
        );
        expect(geminiResult).toEqual(payload);

        vi.unstubAllGlobals();
      }),
    );
  });
});
