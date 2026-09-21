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
 * Holds all UI state for the translator screen and drives the
 * `POST /api/translate` round trip. State is exposed as an immutable
 * [StateFlow] of [UiState] so the Compose screen renders purely from state.
 * The [TranslateApi] is injected so tests can supply a fake.
 */
class TranslationViewModel(
    private val api: TranslateApi = Network.createTranslateApi(),
) : ViewModel() {

    data class UiState(
        val inputText: String = "",
        val targetLanguage: SupportedLanguage = SupportedLanguage.SPANISH,
        val result: TranslateResponse? = null,
        val errorMessage: String? = null,
        val isLoading: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun onTextChange(text: String) {
        _state.update { it.copy(inputText = text) }
    }

    fun onLanguageChange(lang: SupportedLanguage) {
        _state.update { it.copy(targetLanguage = lang) }
    }

    /**
     * Submits the current input for translation. Empty input short-circuits
     * with a prompt and sends no request, preserving any existing result and
     * the selected language. Otherwise it enters the loading state and posts
     * the trimmed text plus selected language, mapping any failure to a
     * retryable error message while keeping the input intact.
     */
    fun translate() {
        val text = _state.value.inputText.trim()
        if (text.isEmpty()) {
            _state.update { it.copy(errorMessage = "Please enter some text to translate.") }
            return
        }

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
