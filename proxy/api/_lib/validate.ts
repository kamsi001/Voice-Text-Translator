/**
 * Input validation for `POST /api/translate` (task 1.2).
 *
 * `validateInput` enforces the request contract BEFORE any provider is invoked
 * so that malformed or abusive input never incurs provider cost:
 *   - `text` must be a string that is non-empty after trimming and no longer
 *     than `MAX_TEXT_LENGTH` characters.
 *   - `targetLanguage` must be one of `SUPPORTED_LANGUAGES`, matched
 *     case-insensitively and normalized to its canonical casing.
 *
 * On success it returns the sanitized values (trimmed text, canonical language);
 * on failure it returns a client-safe error message suitable for a 400 body.
 *
 * Validates Property 5 (length bound) and Property 4 (language allowlist).
 * Requirements: 7.2, 7.3, 8.4.
 */
import {
  MAX_TEXT_LENGTH,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type TranslateRequest,
} from "./contract.js";

/** Discriminated result of validating a raw request body. */
export type Validated =
  | { ok: true; value: { text: string; targetLanguage: SupportedLanguage } }
  | { ok: false; error: string };

/**
 * Validate and normalize a raw request body against the translate contract.
 *
 * @param body The parsed request body (untrusted, hence `unknown`).
 * @returns A `Validated` result with sanitized values on success, or a
 *          client-safe error message on failure.
 */
export function validateInput(body: unknown): Validated {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }

  const { text, targetLanguage } = body as Partial<TranslateRequest>;

  // text checks
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Text is required." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `Text exceeds ${MAX_TEXT_LENGTH} characters.` };
  }

  // language checks (case-insensitive, normalized to canonical form)
  if (typeof targetLanguage !== "string") {
    return { ok: false, error: "Target language is required." };
  }
  const canonical = SUPPORTED_LANGUAGES.find(
    (l) => l.toLowerCase() === targetLanguage.trim().toLowerCase(),
  );
  if (!canonical) {
    return { ok: false, error: "Unsupported target language." };
  }

  return { ok: true, value: { text: text.trim(), targetLanguage: canonical } };
}
