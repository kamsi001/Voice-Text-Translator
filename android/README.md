# Android App — Voice & Text Translator

Native Android client (Kotlin, Jetpack Compose) for the Voice & Text Translator.
It sends text to the translation proxy and displays the translation, a
pronunciation guide, and a short note on usage context.

## Features

- Enter text, pick a target language, and translate
- Supported languages: Spanish, French, Japanese, and German
- Results show translation, pronunciation, and context
- Loading and error states, with input preserved so you can retry

## Requirements

- Android Studio (current stable)
- JDK 17
- Android SDK Platform 34
- Runs on Android 7.0 (API 24) and above

## Running it

1. Open the `android/` folder in Android Studio and let Gradle sync.
2. Point the app at your proxy by setting `BASE_URL` in
   [`app/build.gradle.kts`](app/build.gradle.kts). The `release` build targets
   the deployed proxy over HTTPS; the `debug` build targets a local
   `vercel dev` instance at `http://10.0.2.2:3000/` (the emulator's alias for
   your machine's localhost).
3. Pick a device or emulator and click **Run**.

From the command line:

```bash
# from the android/ directory
./gradlew assembleDebug        # macOS/Linux
gradlew.bat assembleDebug      # Windows
```
