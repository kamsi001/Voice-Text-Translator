package com.example.voicetexttranslator.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.voicetexttranslator.data.MAX_TEXT_LENGTH
import com.example.voicetexttranslator.data.SupportedLanguage
import com.example.voicetexttranslator.data.TranslateResponse
import com.example.voicetexttranslator.ui.theme.VoiceTextTranslatorTheme

/**
 * The single-screen translator UI (Task 4.4).
 *
 * Renders purely from [TranslationViewModel.UiState] collected via
 * [collectAsState] and delegates all behavior to the view model
 * ([TranslationViewModel.onTextChange], [TranslationViewModel.onLanguageChange],
 * [TranslationViewModel.translate]).
 *
 * Controls (Requirement 9.1):
 *  - one text input field (capped at [MAX_TEXT_LENGTH], Requirements 1.2, 9.2),
 *  - one language selection control offering exactly the four
 *    [SupportedLanguage] values, defaulting to Spanish (Requirements 3.1, 9.2),
 *  - one translate button (Requirement 4.2),
 *  - one result display with three fields and empty-field indicators
 *    (Requirements 1.3, 4.2).
 *
 * Loading and error states are surfaced from state (Requirements 4.1, 4.3).
 *
 * NOTE: The voice input control is added in Task 5; it is intentionally absent
 * here so this task only wires the typed-text flow.
 */
@Composable
fun TranslateScreen(
    modifier: Modifier = Modifier,
    viewModel: TranslationViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsState()

    TranslateScreenContent(
        state = state,
        onTextChange = viewModel::onTextChange,
        onLanguageChange = viewModel::onLanguageChange,
        onTranslate = viewModel::translate,
        modifier = modifier,
    )
}

/**
 * Stateless rendering of the translator screen so it can be previewed and
 * tested with any [TranslationViewModel.UiState] without a live view model.
 */
@Composable
private fun TranslateScreenContent(
    state: TranslationViewModel.UiState,
    onTextChange: (String) -> Unit,
    onLanguageChange: (SupportedLanguage) -> Unit,
    onTranslate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Voice & Text Translator",
            style = MaterialTheme.typography.headlineSmall,
        )

        // Text input field, capped at MAX_TEXT_LENGTH (Requirements 1.2, 9.2).
        OutlinedTextField(
            value = state.inputText,
            onValueChange = { new ->
                onTextChange(if (new.length > MAX_TEXT_LENGTH) new.take(MAX_TEXT_LENGTH) else new)
            },
            label = { Text("Enter text to translate") },
            supportingText = { Text("${state.inputText.length} / $MAX_TEXT_LENGTH") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
            modifier = Modifier.fillMaxWidth(),
        )

        // Language selection control offering exactly the four supported
        // languages, defaulting to Spanish (Requirements 3.1, 9.2).
        LanguageDropdown(
            selected = state.targetLanguage,
            onLanguageChange = onLanguageChange,
        )

        // Translate button (Requirement 4.2). Disabled while a request is in
        // flight so the loading state is unambiguous.
        Button(
            onClick = onTranslate,
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Translate")
        }

        when {
            // Loading indicator while in progress (Requirements 4.1, 4.4).
            state.isLoading -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator()
                }
            }

            // Error message on failure (Requirements 1.6, 4.3, 9.5).
            state.errorMessage != null -> {
                Text(
                    text = state.errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            // Three-field result display (Requirements 1.2, 1.3, 4.2).
            state.result != null -> {
                ResultDisplay(result = state.result)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguageDropdown(
    selected: SupportedLanguage,
    onLanguageChange: (SupportedLanguage) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            value = selected.label,
            onValueChange = {},
            readOnly = true,
            label = { Text("Target language") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            // Exactly the four supported languages, no others (Requirement 3.1).
            SupportedLanguage.entries.forEach { language ->
                DropdownMenuItem(
                    text = { Text(language.label) },
                    onClick = {
                        onLanguageChange(language)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun ResultDisplay(
    result: TranslateResponse,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ResultField(label = "Translation", value = result.translation)
            ResultField(label = "Pronunciation", value = result.pronunciation)
            ResultField(label = "Context", value = result.context)
        }
    }
}

/**
 * Renders a single labelled result field, showing an empty-field indicator
 * when the value is absent or blank rather than omitting the field
 * (Requirement 1.3).
 */
@Composable
private fun ResultField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    val isEmpty = value.isBlank()
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = if (isEmpty) EMPTY_FIELD_INDICATOR else value,
            style = MaterialTheme.typography.bodyLarge,
            color = if (isEmpty) {
                MaterialTheme.colorScheme.onSurfaceVariant
            } else {
                MaterialTheme.colorScheme.onSurface
            },
        )
    }
}

/** Placeholder shown when a result field is absent or empty (Requirement 1.3). */
private const val EMPTY_FIELD_INDICATOR = "—"

@Preview(showBackground = true)
@Composable
private fun TranslateScreenLoadingPreview() {
    VoiceTextTranslatorTheme {
        TranslateScreenContent(
            state = TranslationViewModel.UiState(inputText = "Hello", isLoading = true),
            onTextChange = {},
            onLanguageChange = {},
            onTranslate = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TranslateScreenResultPreview() {
    VoiceTextTranslatorTheme {
        TranslateScreenContent(
            state = TranslationViewModel.UiState(
                inputText = "Hello",
                result = TranslateResponse(
                    translation = "Hola",
                    pronunciation = "OH-lah",
                    context = "A common informal greeting.",
                ),
            ),
            onTextChange = {},
            onLanguageChange = {},
            onTranslate = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TranslateScreenEmptyFieldsPreview() {
    VoiceTextTranslatorTheme {
        TranslateScreenContent(
            state = TranslationViewModel.UiState(
                inputText = "Hello",
                result = TranslateResponse(translation = "Hola", pronunciation = "", context = ""),
            ),
            onTextChange = {},
            onLanguageChange = {},
            onTranslate = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TranslateScreenErrorPreview() {
    VoiceTextTranslatorTheme {
        TranslateScreenContent(
            state = TranslationViewModel.UiState(
                inputText = "Hello",
                errorMessage = "Network error. Please check your connection and try again.",
            ),
            onTextChange = {},
            onLanguageChange = {},
            onTranslate = {},
        )
    }
}
