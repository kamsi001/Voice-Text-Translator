package com.example.voicetexttranslator

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.voicetexttranslator.ui.theme.VoiceTextTranslatorTheme

/**
 * Single-activity host for the translator UI.
 *
 * For this scaffold task (4.1) the screen is intentionally blank — it only
 * proves the project builds, launches, and renders a Compose surface. The
 * actual controls (text field, voice input, language selector, result
 * display) are added in tasks 4.2–4.4.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            VoiceTextTranslatorTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    TranslateScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

/**
 * Placeholder single screen. Replaced with the real translation UI in
 * tasks 4.2–4.4.
 */
@Composable
fun TranslateScreen(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(text = "Voice & Text Translator")
    }
}

@Preview(showBackground = true)
@Composable
fun TranslateScreenPreview() {
    VoiceTextTranslatorTheme {
        TranslateScreen()
    }
}
