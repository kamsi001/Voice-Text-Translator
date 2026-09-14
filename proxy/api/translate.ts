import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ErrorResponse, TranslateResponse } from "./_lib/contract.js";
import { validateInput } from "./_lib/validate.js";

/**
 * POST /api/translate
 *
 * SCAFFOLD (tasks 1.1, 1.2): this is the handler skeleton. It returns a 405 for
 * non-POST methods, a 400 for a non-JSON / non-object body, and a 400 for input
 * that fails validation (`validateInput`). On valid input it currently returns a
 * stubbed 200. Rate limiting, provider wiring, and response normalization are
 * added in later tasks.
 */
export default function handler(req: VercelRequest, res: VercelResponse): void {
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

  // Stubbed success response. Later tasks replace this with the provider
  // translation of `text` into `targetLanguage` + normalization producing a
  // real result. The validated values flow through so the structure is ready.
  void text;
  void targetLanguage;
  const stub: TranslateResponse = {
    translation: "",
    pronunciation: "",
    context: "",
  };
  send(res, 200, stub);
}

/** Apply permissive CORS headers for cross-origin mobile client access. */
function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/** Send exactly one JSON response with the given status code. */
function send(
  res: VercelResponse,
  status: 200,
  body: TranslateResponse,
): void;
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
