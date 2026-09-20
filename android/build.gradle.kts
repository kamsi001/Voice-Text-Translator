// Top-level build file. Configuration common to all sub-projects/modules
// lives in the app module's build.gradle.kts. Plugins are declared here with
// `apply false` so their versions are resolved once and applied per-module.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
