/**
 * Shared API contract types and constants for the translator proxy.
 * Single source of truth for the `POST /api/translate` contract.
 */

export const MAX_TEXT_LENGTH = 500;

export const SUPPORTED_LANGUAGES = [
  "Spanish",
  "French",
  "Japanese",
  "German",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
}

export interface TranslateResponse {
  translation: string;
  pronunciation: string;
  context: string;
}

export interface ErrorResponse {
  error: string;
}

export type HandlerResult =
  | { ok: true; status: 200; body: TranslateResponse }
  | { ok: false; status: number; body: ErrorResponse };
