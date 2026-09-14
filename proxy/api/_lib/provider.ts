/**
 * Provider-agnostic translation interface and factory (task 2.1).
 *
 * The proxy depends ONLY on {@link TranslationProvider.translate}, so swapping
 * the concrete implementation is a single-file change here — no handler,
 * validator, or normalizer edits required (Property P7, Requirements 6.1, 6.3).
 *
 * {@link getProvider} constructs the default {@link GeminiProvider}, reading the
 * API key EXCLUSIVELY from `process.env.GEMINI_API_KEY` (Requirement 5.1). If
 * that env var is absent or empty the factory throws a {@link MissingConfigError}
 * so the proxy refuses to serve with a missing-configuration error
 * (Requirement 5.2). The key is never logged nor placed in any error message or
 * response body (Property P1, Requirements 5.3, 5.5).
 *
 * NOTE: The full Gemini `translate` implementation (prompt, `generateContent`
 * call, response parsing) is task 2.2. Here `GeminiProvider` only stores the key
 * and exposes the interface so the factory compiles and callers can wire in.
 */
import type { SupportedLanguage } from "./contract.js";

/**
 * Gemini model identifier used in the `generateContent` endpoint path.
 *
 * NOTE: This exact model string (and the `v1beta` API version below) is a
 * build-time-confirmed constant — verify it against the Google AI Studio
 * console before deploying, as Google revises model names/versions over time.
 */
const GEMINI_MODEL = "gemini-1.5-flash";

/** Base URL for the Gemini `generateContent` REST endpoint (see NOTE on {@link GEMINI_MODEL}). */
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * `responseSchema` requiring exactly the three contract string keys. Combined
 * with `responseMimeType: "application/json"` this constrains Gemini to emit a
 * JSON object with `translation`, `pronunciation`, and `context` (Requirement 6.4).
 */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    translation: { type: "STRING" },
    pronunciation: { type: "STRING" },
    context: { type: "STRING" },
  },
  required: ["translation", "pronunciation", "context"],
} as const;

/**
 * Provider-agnostic translation interface. This is the sole translation entry
 * point the rest of the proxy is allowed to depend on. `translate` returns the
 * raw provider payload as `unknown`; the normalizer (task 2.3) coerces it into
 * the contract shape.
 */
export interface TranslationProvider {
  translate(text: string, targetLanguage: string): Promise<unknown>;
}

/**
 * Thrown when required provider configuration (the API key) is missing.
 *
 * The message is intentionally generic and NEVER contains the key value, so it
 * is safe to surface as a missing-configuration error and to log.
 */
export class MissingConfigError extends Error {
  constructor(message = "Server is missing required configuration.") {
    super(message);
    this.name = "MissingConfigError";
  }
}

/**
 * Default {@link TranslationProvider} backed by Gemini Flash.
 *
 * The API key is held privately and is never logged or exposed. The concrete
 * `generateContent` call is implemented in task 2.2; this stub keeps the key so
 * the factory can construct the provider and callers can depend on the
 * interface.
 */
export class GeminiProvider implements TranslationProvider {
  readonly #apiKey: string;

  constructor(apiKey: string) {
    this.#apiKey = apiKey;
  }

  async translate(
    text: string,
    targetLanguage: SupportedLanguage | string,
  ): Promise<unknown> {
    const prompt =
      `Translate the following text into ${targetLanguage}. ` +
      `Respond strictly as a JSON object with exactly these keys: ` +
      `"translation" (the translated text), ` +
      `"pronunciation" (a phonetic pronunciation guide for the translation), ` +
      `"context" (a brief note on when and how to use the phrase). ` +
      `Text: ${text}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    // The API key is passed only as a query parameter and is NEVER logged nor
    // placed in any thrown error message (Property P1, Requirements 5.3, 5.5).
    const resp = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(this.#apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      // Status only — no key, no request echo. The handler surfaces this as 502.
      throw new Error(`Gemini HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof jsonText !== "string") {
      throw new Error("Gemini response missing candidate text.");
    }

    // JSON.parse throws on malformed output; that propagates to the handler,
    // which responds 502 per Requirement 8.6.
    return JSON.parse(jsonText);
  }
}

/**
 * Construct the default {@link TranslationProvider}.
 *
 * Reads the API key exclusively from `process.env.GEMINI_API_KEY`. Throws
 * {@link MissingConfigError} when the key is absent or empty (after trimming) so
 * the proxy refuses to serve. To swap providers later, change only this factory,
 * e.g. `return new OpenAiProvider(process.env.OPENAI_API_KEY!)`.
 *
 * @returns The configured translation provider.
 * @throws {MissingConfigError} When `GEMINI_API_KEY` is missing or empty.
 */
export function getProvider(): TranslationProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new MissingConfigError();
  }
  return new GeminiProvider(apiKey);
}
