/**
 * Provider-agnostic translation interface and factory. The rest of the proxy
 * depends only on {@link TranslationProvider.translate}, so swapping the
 * concrete implementation is a single change in {@link getProvider}.
 */
import type { SupportedLanguage } from "./contract.js";

// Verify against the Google AI Studio console before deploying; Google revises
// model names and API versions over time.
const GEMINI_MODEL = "gemini-1.5-flash";

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    translation: { type: "STRING" },
    pronunciation: { type: "STRING" },
    context: { type: "STRING" },
  },
  required: ["translation", "pronunciation", "context"],
} as const;

export interface TranslationProvider {
  translate(text: string, targetLanguage: string): Promise<unknown>;
}

/** Thrown when the API key is missing. The message never contains the key. */
export class MissingConfigError extends Error {
  constructor(message = "Server is missing required configuration.") {
    super(message);
    this.name = "MissingConfigError";
  }
}

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

    const resp = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(this.#apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      // Status only, so the key and request are never echoed.
      throw new Error(`Gemini HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof jsonText !== "string") {
      throw new Error("Gemini response missing candidate text.");
    }

    return JSON.parse(jsonText);
  }
}

/**
 * Constructs the default provider from `process.env.GEMINI_API_KEY`. Throws
 * {@link MissingConfigError} when the key is absent or empty. To swap providers,
 * change only this factory.
 */
export function getProvider(): TranslationProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new MissingConfigError();
  }
  return new GeminiProvider(apiKey);
}
