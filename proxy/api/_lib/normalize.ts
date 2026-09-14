/**
 * Response normalization for `POST /api/translate` (task 2.3).
 *
 * `normalizeResponse` coerces the raw, untrusted provider payload (`unknown`)
 * into EXACTLY the contract shape `{ translation, pronunciation, context }`,
 * dropping any additional fields the provider may have returned
 * (Requirement 8.9, Property P3). It enforces that:
 *   - `translation` is a string that is non-empty (Requirement 8.2 — the
 *     success body must carry a usable translation).
 *   - `pronunciation` and `context` are strings; empty strings are allowed for
 *     these two fields (the client renders empty-field indicators).
 *
 * When the payload is not a non-null object, or any of the three fields is
 * missing / the wrong type / (for `translation`) empty, it returns
 * `{ ok: false }`. The handler surfaces that as a 502 (Requirements 8.6, 8.8):
 * provider output that cannot be normalized into the contract shape is treated
 * the same as a provider failure.
 *
 * Requirements: 8.2, 8.8, 8.9. Property P3 (contract shape).
 */
import type { TranslateResponse } from "./contract.js";

/** Discriminated result of normalizing raw provider output. */
export type Normalized = { ok: true; value: TranslateResponse } | { ok: false };

/**
 * Coerce raw provider output into the exact `TranslateResponse` contract shape.
 *
 * @param raw The untrusted provider payload (hence `unknown`).
 * @returns `{ ok: true, value }` with exactly the three contract fields on
 *          success, or `{ ok: false }` when the payload cannot be normalized.
 */
export function normalizeResponse(raw: unknown): Normalized {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false };
  }

  const { translation, pronunciation, context } = raw as Record<
    string,
    unknown
  >;

  // translation must be a non-empty string (Requirement 8.2).
  if (typeof translation !== "string" || translation.length === 0) {
    return { ok: false };
  }
  // pronunciation and context must be strings (empty allowed).
  if (typeof pronunciation !== "string" || typeof context !== "string") {
    return { ok: false };
  }

  // Return EXACTLY the three contract fields, dropping any extras (Req 8.9).
  return { ok: true, value: { translation, pronunciation, context } };
}
