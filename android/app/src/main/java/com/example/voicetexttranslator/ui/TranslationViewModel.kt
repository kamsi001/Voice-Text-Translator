package com.example.voicetexttranslator.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.voicetexttranslator.data.Network
import com.example.voicetexttranslator.data.SupportedLanguage
import com.example.voicetexttranslator.data.TranslateApi
import com.example.voicetexttranslator.data.TranslateRequest
import com.example.voicetexttranslator.data.TranslateResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Holds all UI state for the single-screen translator and drives the
 * `POST /api/translate` round trip.
 *
 * State is exposed as an immutable [StateFlow] of [UiState] so the Compose
 * screen (Task 4.4) can render loading / result / error purely from state.
 * The [TranslateApi] is injected via the constructor so tests (Task 4.5) can
 * supply a fake; it defaults to [Network.createTranslateApi] for production use.
 *
 * The proxy round trip is bounded by OkHttp's 30s connect/read/write timeout
 * (see `Network.kt`), which surfaces as an exception here and is mapped to an
 * error message (Requirement 1.6).
 */
class TranslationViewModel(
    private val api: TranslateApi = Network.createTranslateApi(),
) : ViewModel() {

    /**
     * Complete, immutable snapshot of the translator screen.
     *
     * @property inputText the current text field contents (typed or dictated).
     * @property targetLanguage the selected language; defaults to
     *   [SupportedLanguage.SPANISH] (Requirement 3.2) and is retained across
     *   translations (Requirement 3.3).
     * @property result the latest successful translation, or `null` if none.
     * @property errorMessage a user-facing error/validation message, or `null`.
     * @property isLoading `true` while a request is in flight (Requirements 4.1, 4.4).
     */
    data class UiState(
        val inputText: String = "",
        val targetLanguage: SupportedLanguage = SupportedLanguage.SPANISH,
        val result: TranslateResponse? = null,
        val errorMessage: String? = null,
        val isLoading: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())

    /** Observable UI state consumed by the Compose screen. */
    val state: StateFlow<UiState> = _state.asStateFlow()

    /** Updates the input text as the user types or dictates. */
    fun onTextChange(text: String) {
        _state.update { it.copy(inputText = text) }
    }

    /**
     * Changes the selected target language. The chosen value's
     * [SupportedLanguage.label] is what gets sent to the proxy as
     * `targetLanguage` on the next [translate] (Requirement 3.4).
     */
    fun onLanguageChange(lang: SupportedLanguage) {
        _state.update { it.copy(targetLanguage = lang) }
    }

    /**
     * Submits the current input for translation.
     *
     * Behavior:
     *  - **Empty after trim:** short-circuits with a require-input message and
     *    sends no request. The existing [UiState.result] and selected
     *    [UiState.targetLanguage] are preserved (Requirement 1.4).
     *  - **Otherwise:** clears any previous result/error and enters the loading
     *    state (Requirements 1.5, 4.1), then posts the trimmed text plus the
     *    selected language label to the proxy (Requirements 1.1, 3.4).
     *  - **Success (2xx with body):** populates [UiState.result] and clears
     *    loading/error.
     *  - **Non-success / network / timeout / decode failure:** surfaces an
     *    error message and clears loading while retaining the input so the user
     *    can retry (Requirements 1.6, 4.3, 9.5).
     */
    fun translate() {
        val text = _state.value.inputText.trim()
        if (text.isEmpty()) {
            // No request: preserve current result and language; prompt for input.
            _state.update { it.copy(errorMessage = "Please enter some text to translate.") }
            return
        }

        // Enter loading and clear any previous result/error (Requirement 1.5).
        _state.update { it.copy(isLoading = true, errorMessage = null, result = null) }

        viewModelScope.launch {
            try {
                val resp = api.translate(
                    TranslateRequest(text, _state.value.targetLanguage.label),
                )
                val body = resp.body()
                if (resp.isSuccessful && body != null) {
                    _state.update {
                        it.copy(result = body, errorMessage = null, isLoading = false)
                    }
                } else {
                    _state.update {
                        it.copy(
                            errorMessage = "Translation failed (${resp.code()}). Please try again.",
                            isLoading = false,
                        )
                    }
                }
            } catch (e: Exception) {
                // Network failure, timeout, or response decoding failure: keep
                // the input intact and show a retryable message (9.5, 1.6, 4.3).
                _state.update {
                    it.copy(
                        errorMessage = e.message?.takeIf { m -> m.isNotBlank() }
                            ?: "Network error. Please check your connection and try again.",
                        isLoading = false,
                    )
                }
            }
        }
    }
}
