package com.example.voicetexttranslator.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Retrofit interface for the translator proxy. Returns the raw [Response] so
 * callers can distinguish a 200 [TranslateResponse] from a non-2xx [ApiError].
 */
interface TranslateApi {
    @POST("api/translate")
    suspend fun translate(@Body body: TranslateRequest): Response<TranslateResponse>
}
