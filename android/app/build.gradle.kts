plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.voicetexttranslator"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.voicetexttranslator"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Single configurable proxy base URL. Point this at either the
        // deployed Vercel proxy or a local `vercel dev` instance.
        //
        // Networking note (see android/README.md):
        //   - Deployed Vercel URL: use as-is over HTTPS, e.g.
        //       "https://<your-project>.vercel.app/"
        //   - Local `vercel dev` from the emulator: the emulator reaches the
        //     host machine's localhost via 10.0.2.2, NOT localhost, e.g.
        //       "http://10.0.2.2:3000/"
        //
        // The default below points at a placeholder deployed proxy. Override
        // it per build type / flavor, or edit this value before building.
        buildConfigField(
            "String",
            "BASE_URL",
            "\"https://voice-text-translator.vercel.app/\""
        )
    }

    buildTypes {
        debug {
            // Local development against `vercel dev` on the host machine.
            // 10.0.2.2 is the emulator's alias for the host's loopback.
            buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:3000/\"")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Deployed Vercel proxy over HTTPS.
            buildConfigField(
                "String",
                "BASE_URL",
                "\"https://voice-text-translator.vercel.app/\""
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        // Enables generation of the BuildConfig class so BASE_URL is available.
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    testImplementation(libs.junit)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
