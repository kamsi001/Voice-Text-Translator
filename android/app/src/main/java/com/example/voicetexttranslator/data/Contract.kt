package com.example.voicetexttranslator.data

/**
 * Shared API contract types for `POST /api/translate`.
 *
 * These mirror the proxy's contract exactly (see `proxy/api/_lib/contract.ts`)
 * and the iOS Codable types, so all three platforms decode identical shapes:
 *   - Request body:    { text, targetLanguage }
 *   - Success (200):   { translation, pronunciation, context }
 *   - Error (non-2xx): { error }
 */

/** Request body for `POST /api/translate`. */
data class TranslateRequest(
    val text: String,
    val targetLanguage: String,
)

/** Success response body (HTTP 200). */
data class TranslateResponse(
    val translation: String,
    val pronunciation: String,
    val context: String,
)

/** Error response body for any non-2xx response. */
data class ApiError(
    val error: String,
)

/**
 * The languages the translator supports. Kept in parity with the proxy's
 * `SUPPORTED_LANGUAGES` and the iOS `SupportedLanguage` enum.
 *
 * [label] is the canonical string sent to the proxy as `targetLanguage`.
 */
enum class SupportedLanguage(val label: String) {
    SPANISH("Spanish"),
    FRENCH("French"),
    JAPANESE("Japanese"),
    GERMAN("German"),
}

/**
 * Maximum length of translatable input text. Kept in parity with the proxy's
 * `MAX_TEXT_LENGTH` and the iOS client so validation behaves identically
 * across platforms.
 */
const val MAX_TEXT_LENGTH: Int = 500
