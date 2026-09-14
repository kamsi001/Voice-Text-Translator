/**
 * Shared API contract types and constants for the AI Voice & Text Translator proxy.
 *
 * These definitions are the single source of truth for the `POST /api/translate`
 * contract. Later tasks (validator, provider, normalizer) import from this module.
 * The mobile clients mirror these shapes (iOS Codable, Android data classes).
 */

/** Maximum accepted input length, enforced before any provider call to bound token usage. */
export const MAX_TEXT_LENGTH = 500;

/** Day-one supported target languages (allowlist). */
export const SUPPORTED_LANGUAGES = [
  "Spanish",
  "French",
  "Japanese",
  "German",
] as const;

/** A canonical supported target language value. */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Request body accepted by `POST /api/translate`. */
export interface TranslateRequest {
  text: string;
  targetLanguage: string;
}

/** Success (HTTP 200) response body. */
export interface TranslateResponse {
  translation: string;
  pronunciation: string;
  context: string;
}

/** Error (non-2xx) response body. */
export interface ErrorResponse {
  error: string;
}

/**
 * Discriminated result used internally by the handler to model the single
 * response that will be sent: either a 200 success or a non-2xx error.
 */
export type HandlerResult =
  | { ok: true; status: 200; body: TranslateResponse }
  | { ok: false; status: number; body: ErrorResponse };
