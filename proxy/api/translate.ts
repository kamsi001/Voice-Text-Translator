import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ErrorResponse, TranslateResponse } from "./_lib/contract.js";

/**
 * POST /api/translate
 *
 * SCAFFOLD (task 1.1): this is the handler skeleton. It currently returns a
 * stubbed 200 for a valid POST, 405 for non-POST methods, and 400 for a
 * non-JSON / non-object body. Full input validation, rate limiting, provider
 * wiring, and response normalization are added in later tasks.
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

  // Stubbed success response. Later tasks replace this with validation +
  // provider translation + normalization producing a real result.
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
