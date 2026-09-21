# Voice & Text Translator

A lightweight translation service that turns a word or phrase into its
translation, a pronunciation guide, and a short note on how to use it in
context. It pairs a native Android app with a small serverless proxy that keeps
the AI provider key safely on the server, away from client apps.

## What it does

Enter a piece of text, pick a target language, and get back three things:

- **Translation** — the phrase in the target language
- **Pronunciation** — a phonetic guide so you know how to say it
- **Context** — a brief note on when and how the phrase is used

Supported languages: **Spanish**, **French**, **Japanese**, and **German**.

## How it works

```
┌─────────────────────┐   POST /api/translate   ┌──────────────────────┐   holds the API key   ┌─────────────────────┐
│  Android app         │ ──────────────────────► │  Vercel proxy         │ ────────────────────► │  AI provider (Gemini)│
│  (Jetpack Compose)   │ ◄────────────────────── │  validate · normalize │ ◄──────────────────── │                      │
└─────────────────────┘        JSON result       └──────────────────────┘                       └─────────────────────┘
```

The proxy exists so the AI provider key never ships inside a client app. Each
request is validated, forwarded to the translation provider, and normalized into
a strict, predictable JSON response.

## Components

| Directory              | What it is                                             |
| ---------------------- | ------------------------------------------------------ |
| [`android/`](android/) | Native Android client (Kotlin, Jetpack Compose)        |
| [`proxy/`](proxy/)     | Vercel serverless proxy exposing `POST /api/translate` |

Each directory has its own README with setup and run instructions.

## API

### `POST /api/translate`

**Request**

```json
{
  "text": "good morning",
  "targetLanguage": "Spanish"
}
```

**Response** `200 OK`

```json
{
  "translation": "buenos días",
  "pronunciation": "BWEH-nohs DEE-ahs",
  "context": "A common greeting used before noon."
}
```

**Errors** return `{ "error": "..." }` with an appropriate status:

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| `400`  | Invalid body, empty/over-length text, or bad language |
| `405`  | Method other than `POST`                              |
| `500`  | Server is missing its provider configuration          |
| `502`  | Provider failed or returned an unusable result        |

## Getting started

**Proxy**

```bash
cd proxy
npm install
```

Set your provider API key as an environment variable (locally via `.env` or in
your Vercel project settings), then deploy the `proxy/` directory to Vercel or
run it locally with the Vercel CLI:

```
GEMINI_API_KEY=your-key-here
```

**Android app**

Open the `android/` folder in Android Studio, point `BASE_URL` at your proxy
(see [`android/README.md`](android/README.md)), and run it on an emulator or
device.

## License

See the repository for license details.
