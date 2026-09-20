package com.example.voicetexttranslator.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Retrofit interface for the translator proxy.
 *
 * The single endpoint posts a [TranslateRequest] JSON body to `api/translate`
 * (resolved relative to the configured proxy base URL, which is HTTPS for the
 * deployed proxy) and returns the raw [Response] so callers can distinguish a
 * 200 success body ([TranslateResponse]) from a non-2xx error body ([ApiError]).
 */
interface TranslateApi {
    @POST("api/translate")
    suspend fun translate(@Body body: TranslateRequest): Response<TranslateResponse>
}
