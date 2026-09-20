# Android App — Voice & Text Translator

Native Android client (Jetpack Compose, Kotlin, JDK 17) for the AI Voice & Text
Translator. It talks to the shared serverless proxy via `POST /api/translate`.

This module was scaffolded in task 4.1. Right now it renders a **blank single
screen** to prove the project builds, launches, and hosts Compose. The real
controls (text field, voice input, language selector, result display) arrive in
tasks 4.2–4.4.

## Requirements

- **Android Studio** (current stable — Koala or newer recommended)
- **JDK 17** (bundled with recent Android Studio as the embedded JBR)
- **Android SDK Platform 34** and build-tools (installed via the SDK Manager)

Project settings:

| Setting          | Value                              |
| ---------------- | ---------------------------------- |
| Language         | Kotlin                             |
| UI toolkit       | Jetpack Compose (Material 3)       |
| JDK / JVM target | 17                                 |
| `compileSdk`     | 34                                 |
| `targetSdk`      | 34                                 |
| `minSdk`         | 24                                 |
| Application ID   | `com.example.voicetexttranslator`  |

## Project structure

```
android/
├── settings.gradle.kts          # Module includes + repositories
├── build.gradle.kts             # Root plugins (apply false)
├── gradle.properties            # Gradle/AndroidX flags
├── gradle/
│   ├── libs.versions.toml        # Version catalog (AGP, Kotlin, Compose BOM)
│   └── wrapper/
│       └── gradle-wrapper.properties
├── gradlew / gradlew.bat        # Wrapper launch scripts
└── app/
    ├── build.gradle.kts          # App module + BASE_URL build config field
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/voicetexttranslator/
        │   ├── MainActivity.kt   # Hosts the (blank) Compose screen
        │   └── ui/theme/         # Color / Type / Theme
        └── res/                  # strings, colors, themes, launcher icons
```

## Configuring the proxy base URL (`BASE_URL`)

The app reads a single configurable proxy base URL from the generated
`BuildConfig.BASE_URL`. It is defined as a `buildConfigField` in
[`app/build.gradle.kts`](app/build.gradle.kts):

- **`debug` build type** → `http://10.0.2.2:3000/` (local `vercel dev`)
- **`release` build type** → `https://voice-text-translator.vercel.app/`
  (deployed Vercel proxy — replace with your actual project URL)
- A default is also set in `defaultConfig` for any other build type.

Read it in code like:

```kotlin
val baseUrl = BuildConfig.BASE_URL // e.g. "http://10.0.2.2:3000/"
```

To change targets, edit the relevant `buildConfigField` value and rebuild, or
switch the active **Build Variant** in Android Studio (View → Tool Windows →
Build Variants).

## Local-dev networking (important)

The way you reach the proxy depends on **where it runs** and **where the app
runs**:

| Proxy location                   | App runs on         | Base URL to use                        |
| -------------------------------- | ------------------- | -------------------------------------- |
| Deployed to Vercel               | Emulator or device  | `https://<project>.vercel.app/` (HTTPS, as-is) |
| Local `vercel dev` on your host  | **Emulator**        | `http://10.0.2.2:<port>/`              |
| Local `vercel dev` on your host  | **Physical device** | `http://<host-LAN-IP>:<port>/`         |

Key points:

- **The Android emulator cannot reach `localhost`/`127.0.0.1` of your host
  machine directly** — inside the emulator that loopback refers to the emulator
  itself. The emulator exposes the host's loopback at the special alias
  **`10.0.2.2`**. So a proxy running on your host at `localhost:3000` is reached
  from the emulator at `http://10.0.2.2:3000/` (this is the `debug` default).
- The **deployed Vercel URL is used as-is over HTTPS** — no rewriting needed.
- **Cleartext HTTP** (the `10.0.2.2` local case) is only needed for local
  development. `minSdk 24`+ blocks cleartext by default on `targetSdk 28+`. If
  you hit a "Cleartext HTTP traffic not permitted" error when pointing at
  `10.0.2.2`, add a debug-only network security config permitting cleartext to
  `10.0.2.2` (do **not** enable cleartext for release builds). This is wired up
  when networking lands in task 4.2.
- A **physical device** on the same Wi-Fi reaches your host by its LAN IP
  (e.g. `http://192.168.1.20:3000/`), and by default `vercel dev` binds to
  localhost — run it with `--listen 0.0.0.0:3000` (or equivalent) so the device
  can connect.

## Setting up an emulator or a device

You need a running target to launch the app. STT testing in **task 5 requires a
physical device** (emulator microphone/STT support is unreliable).

### Option A — Android Virtual Device (emulator)

1. In Android Studio: **Tools → Device Manager → Create Device**.
2. Pick **Pixel 7**, then a system image for **API 34** (download if needed).
3. Finish, then start the AVD from Device Manager.

### Option B — Physical device (required for task 5 STT)

1. On the device: enable **Developer options** (tap Build number 7×).
2. Enable **USB debugging**.
3. Connect via USB and approve the debugging prompt.
4. Confirm it appears in Android Studio's device dropdown.

## Building and running

Open the `android/` folder in Android Studio (it will sync Gradle and download
dependencies), then:

- Select a device/emulator in the toolbar and click **Run** (▶). The blank
  "Voice & Text Translator" screen should appear.
- **Compose Preview:** open `MainActivity.kt`, use the split/design view, and
  confirm `TranslateScreenPreview` renders.
- **Live Edit:** enable it (File → Settings → Editor → Live Edit) and confirm
  edits to the composable reflect on the running app/preview.

### Command-line build

```bash
# from the android/ directory
./gradlew assembleDebug        # macOS/Linux
gradlew.bat assembleDebug      # Windows
```

## Verification status for this task (4.1)

**Automated in this environment:** the full Gradle project structure, module
config, `BASE_URL` build config field, manifest, blank Compose screen, theme,
and resources were created and their contents verified for correctness.

**Must be performed by you in Android Studio (cannot be automated here — no
JDK/Android SDK/emulator is available in the scaffolding environment):**

1. **Generate the Gradle wrapper JAR.** This scaffold includes the wrapper
   scripts and `gradle-wrapper.properties`, but **not** the binary
   `gradle/wrapper/gradle-wrapper.jar` (a binary can't be produced by the
   scaffolding tools). Generate it once with a local Gradle install:
   ```bash
   cd android
   gradle wrapper --gradle-version 8.9
   ```
   Or simply open the `android/` folder in Android Studio, which provisions the
   wrapper automatically on first sync.
2. **Gradle sync** in Android Studio completes without errors.
3. **`./gradlew assembleDebug`** compiles successfully.
4. **Run** the app on the emulator/device and confirm the blank screen renders.
5. **Compose Preview** and **Live Edit** work for fast UI iteration.

Once the wrapper JAR exists and the SDK is installed, `assembleDebug` should
build cleanly against the pinned versions in `gradle/libs.versions.toml`.
