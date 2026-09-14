/**
 * Validates and normalizes the `POST /api/translate` request body before any
 * provider is invoked. `text` must be a non-empty (after trimming) string no
 * longer than `MAX_TEXT_LENGTH`; `targetLanguage` must be one of
 * `SUPPORTED_LANGUAGES`, matched case-insensitively and returned in canonical
 * casing.
 */
import {
  MAX_TEXT_LENGTH,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type TranslateRequest,
} from "./contract.js";

export type Validated =
  | { ok: true; value: { text: string; targetLanguage: SupportedLanguage } }
  | { ok: false; error: string };

export function validateInput(body: unknown): Validated {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }

  const { text, targetLanguage } = body as Partial<TranslateRequest>;

  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Text is required." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `Text exceeds ${MAX_TEXT_LENGTH} characters.` };
  }

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
