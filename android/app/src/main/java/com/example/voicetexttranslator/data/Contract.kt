package com.example.voicetexttranslator.data

/**
 * Shared API contract types for `POST /api/translate`, mirroring the proxy's
 * request/response shapes:
 *   - Request body:    { text, targetLanguage }
 *   - Success (200):   { translation, pronunciation, context }
 *   - Error (non-2xx): { error }
 */

data class TranslateRequest(
    val text: String,
    val targetLanguage: String,
)

data class TranslateResponse(
    val translation: String,
    val pronunciation: String,
    val context: String,
)

data class ApiError(
    val error: String,
)

/** Languages the translator supports. [label] is sent to the proxy as `targetLanguage`. */
enum class SupportedLanguage(val label: String) {
    SPANISH("Spanish"),
    FRENCH("French"),
    JAPANESE("Japanese"),
    GERMAN("German"),
}

/** Maximum length of translatable input text. */
const val MAX_TEXT_LENGTH: Int = 500
