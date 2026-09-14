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
    // Reference the stored key without exposing it, so the field is retained
    // for the task 2.2 implementation and `noUnusedLocals`/lint stays satisfied.
    void this.#apiKey;
    void text;
    void targetLanguage;
    throw new Error("GeminiProvider.translate is not implemented yet.");
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
