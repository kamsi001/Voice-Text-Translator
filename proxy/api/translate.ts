import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ErrorResponse, TranslateResponse } from "./_lib/contract.js";
import { validateInput } from "./_lib/validate.js";
import { getProvider, MissingConfigError } from "./_lib/provider.js";
import { normalizeResponse } from "./_lib/normalize.js";

/**
 * POST /api/translate
 *
 * SCAFFOLD (tasks 1.1, 1.2, 2.3): this is the handler pipeline. It returns a 405
 * for non-POST methods, a 400 for a non-JSON / non-object body, and a 400 for
 * input that fails validation (`validateInput`). On valid input the provider
 * path (task 2.3) is now wired: it calls the {@link getProvider} translation
 * provider, normalizes the raw output into the contract shape, and responds 200
 * on success. A normalize failure or provider throw responds 502; a missing
 * provider configuration responds 500. Rate limiting is added in a later task.
 *
 * Exactly one response is sent per request path, and every non-2xx body is an
 * `ErrorResponse` `{ error }` (Property P3, Requirement 8.8). No API key or raw
 * error internal is ever logged or placed in a response body (Property P1).
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Permissive CORS so both mobile clients can call the endpoint.
  setCorsHeaders(res);

  // Handle CORS preflight before anything else.
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Method guard: only POST is allowed.
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }

  // Body guard: must be a JSON object (not null, not an array, not a primitive).
  // Vercel parses JSON bodies automatically; a malformed/non-JSON body yields a
  // non-object value here.
  const body = req.body;
  if (!isPlainObject(body)) {
    send(res, 400, { error: "Invalid request body." });
    return;
  }

  // Validation (task 1.2): reject empty/over-length text and unsupported
  // languages with a 400 before any provider is invoked. On success we get
  // sanitized values (trimmed text, canonical language casing).
  const validated = validateInput(body);
  if (!validated.ok) {
    send(res, 400, { error: validated.error });
    return;
  }
  const { text, targetLanguage } = validated.value;

  // Provider path (task 2.3): translate the sanitized input, then coerce the
  // raw provider payload into the exact contract shape before responding.
  try {
    const provider = getProvider();
    const raw = await provider.translate(text, targetLanguage);

    const normalized = normalizeResponse(raw);
    if (!normalized.ok) {
      // Provider output could not be coerced into the contract shape. Treated
      // the same as a provider failure per Requirement 8.6.
      send(res, 502, {
        error: "Translation service returned an unexpected result.",
      });
      return;
    }

    send(res, 200, normalized.value);
  } catch (err) {
    // Missing provider configuration (absent/empty GEMINI_API_KEY) is an
    // unexpected server-side error → 500 (Requirements 5.2, 8.7). The message is
    // generic and NEVER contains the key value (Property P1).
    if (err instanceof MissingConfigError) {
      send(res, 500, { error: "Server is not configured for translation." });
      return;
    }

    // Any other thrown error comes from the provider call (transport/HTTP/parse
    // failure) → 502 (Requirement 8.6). We deliberately do NOT include the
    // thrown error's message/internals, which could leak the key or request
    // details (Property P1).
    send(res, 502, {
      error: "Translation service is unavailable. Try again.",
    });
  }
}

/** Apply permissive CORS headers for cross-origin mobile client access. */
function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/** Send exactly one JSON response with the given status code. */
function send(res: VercelResponse, status: 200, body: TranslateResponse): void;
function send(res: VercelResponse, status: number, body: ErrorResponse): void;
function send(
  res: VercelResponse,
  status: number,
  body: TranslateResponse | ErrorResponse,
): void {
  res.status(status).json(body);
}

/** True only for non-null, non-array plain objects. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
