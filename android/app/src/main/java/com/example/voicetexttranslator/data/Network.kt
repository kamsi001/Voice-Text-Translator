package com.example.voicetexttranslator.data

import com.example.voicetexttranslator.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Builds the app's networking stack: an OkHttp client wrapped by Retrofit with
 * Gson JSON (de)serialization, producing a ready-to-use [TranslateApi].
 *
 * The base URL comes from [BuildConfig.BASE_URL], configured per build type in
 * `build.gradle.kts`:
 *   - release: the deployed Vercel proxy over HTTPS
 *   - debug:   a local `vercel dev` instance reached via `10.0.2.2`
 */
object Network {

    /** Connect/read/write timeout budget for the proxy round trip. */
    private const val TIMEOUT_SECONDS = 30L

    /**
     * Creates a [TranslateApi] bound to [baseUrl].
     *
     * @param baseUrl proxy base URL; defaults to the build-configured
     *   [BuildConfig.BASE_URL]. Must end with `/` so the relative
     *   `api/translate` path resolves correctly.
     */
    fun createTranslateApi(baseUrl: String = BuildConfig.BASE_URL): TranslateApi =
        buildRetrofit(baseUrl).create(TranslateApi::class.java)

    private fun buildRetrofit(baseUrl: String): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(buildOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    private fun buildOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }
}
