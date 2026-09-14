/**
 * Coerces the raw, untrusted provider payload into exactly the contract shape
 * `{ translation, pronunciation, context }`, dropping any extra fields. Returns
 * `{ ok: false }` when the payload cannot be normalized (missing/wrong-typed
 * fields, empty translation, or non-object input).
 */
import type { TranslateResponse } from "./contract.js";

export type Normalized = { ok: true; value: TranslateResponse } | { ok: false };

export function normalizeResponse(raw: unknown): Normalized {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false };
  }

  const { translation, pronunciation, context } = raw as Record<
    string,
    unknown
  >;

  if (typeof translation !== "string" || translation.length === 0) {
    return { ok: false };
  }
  if (typeof pronunciation !== "string" || typeof context !== "string") {
    return { ok: false };
  }

  return { ok: true, value: { translation, pronunciation, context } };
}
