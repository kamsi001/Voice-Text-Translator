import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ErrorResponse, TranslateResponse } from "./_lib/contract.js";
import { validateInput } from "./_lib/validate.js";
import { getProvider, MissingConfigError } from "./_lib/provider.js";
import { normalizeResponse } from "./_lib/normalize.js";

/**
 * POST /api/translate
 *
 * Validates the request, calls the translation provider, normalizes the raw
 * output into the contract shape, and sends exactly one response: 200 on
 * success, 400 on bad method/body/input, 502 on provider or normalize failure,
 * and 500 on missing configuration. No API key or raw error internals are ever
 * logged or placed in a response body.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }

  const body = req.body;
  if (!isPlainObject(body)) {
    send(res, 400, { error: "Invalid request body." });
    return;
  }

  const validated = validateInput(body);
  if (!validated.ok) {
    send(res, 400, { error: validated.error });
    return;
  }
  const { text, targetLanguage } = validated.value;

  try {
    const provider = getProvider();
    const raw = await provider.translate(text, targetLanguage);

    const normalized = normalizeResponse(raw);
    if (!normalized.ok) {
      send(res, 502, {
        error: "Translation service returned an unexpected result.",
      });
      return;
    }

    send(res, 200, normalized.value);
  } catch (err) {
    if (err instanceof MissingConfigError) {
      send(res, 500, { error: "Server is not configured for translation." });
      return;
    }

    // Never surface the thrown error's internals; they could leak the key.
    send(res, 502, {
      error: "Translation service is unavailable. Try again.",
    });
  }
}

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res: VercelResponse, status: 200, body: TranslateResponse): void;
function send(res: VercelResponse, status: number, body: ErrorResponse): void;
function send(
  res: VercelResponse,
  status: number,
  body: TranslateResponse | ErrorResponse,
): void {
  res.status(status).json(body);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
