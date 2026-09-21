package com.example.voicetexttranslator

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import com.example.voicetexttranslator.ui.TranslateScreen
import com.example.voicetexttranslator.ui.theme.VoiceTextTranslatorTheme

/**
 * Single-activity host for the translator UI.
 *
 * Hosts the real [TranslateScreen] (Task 4.4), which collects state from
 * [com.example.voicetexttranslator.ui.TranslationViewModel] and renders the
 * text field, language selector, translate button, and result/loading/error
 * states. Voice input is added in Task 5.
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
