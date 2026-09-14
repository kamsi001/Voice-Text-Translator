/**
 * Unit + property tests for `GeminiProvider` and the `TranslationProvider`
 * abstraction. `fetch` is mocked so no network call is made. Uses Vitest and
 * fast-check.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import { GeminiProvider, type TranslationProvider } from "./provider.js";

const CONTRACT_KEYS = ["translation", "pronunciation", "context"] as const;

function geminiOkResponse(jsonText: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: jsonText }] } }],
    }),
  } as unknown as Response;
}

function geminiErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

function mockFetch(response: Response) {
  const spy = vi.fn(async () => response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
        JSON.stringify({
          translation: "Hola",
          pronunciation: "OH-lah",
          context: "greeting",
        }),
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
        JSON.stringify({
          translation: "Bonjour",
          pronunciation: "bohn-ZHOOR",
          context: "greeting",
        }),
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
        JSON.stringify({
          translation: "Hallo",
          pronunciation: "HAH-loh",
          context: "greeting",
        }),
      ),
    );

    await new GeminiProvider("test-key").translate("hi", "German");

    const body = parseRequestBody(spy);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("sets a responseSchema of OBJECT with three required STRING keys", async () => {
    const spy = mockFetch(
      geminiOkResponse(
        JSON.stringify({
          translation: "こんにちは",
          pronunciation: "kon-ni-chi-wa",
          context: "greeting",
        }),
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

    const result = await new GeminiProvider("test-key").translate(
      "hello",
      "Spanish",
    );

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
        JSON.stringify({
          translation: "Hola",
          pronunciation: "OH-lah",
          context: "greeting",
        }),
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

describe("provider swappability", () => {
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

        const stub: TranslationProvider = {
          translate: async (t, l) => ({ echoedText: t, echoedLang: l }),
        };
        const stubResult = await callThrough(stub, text, lang);
        expect(stubResult).toEqual({ echoedText: text, echoedLang: lang });

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
