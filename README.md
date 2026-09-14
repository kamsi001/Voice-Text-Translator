# Voice & Text Translator

A lightweight translation service that turns a word or phrase into its
translation, a pronunciation guide, and a short note on how to use it in
context. Built around a small serverless proxy that keeps the AI provider key
safely on the server, away from client apps.

## What it does

Send a piece of text and a target language, and the service returns three
things:

- **Translation** — the phrase in the target language
- **Pronunciation** — a phonetic guide so you know how to say it
- **Context** — a brief note on when and how the phrase is used

Day-one supported languages are **Spanish**, **French**, **Japanese**, and
**German**.

## How it works

```
Client (mobile / web)
        │  POST /api/translate
        ▼
┌─────────────────────────────┐
│  Vercel serverless proxy     │
│                              │
│  validate → translate →      │
│  normalize → respond         │
└─────────────────────────────┘
        │  holds the API key server-side
        ▼
   AI translation provider (Gemini)
```

The proxy exists so the AI provider key never ships inside a client app. Every
request flows through a small, predictable pipeline:

1. **Validate** — reject empty, over-length, or unsupported-language input
   before any provider call, so bad requests never cost anything.
2. **Translate** — call the translation provider behind a provider-agnostic
   interface, so the underlying model can be swapped in one place.
3. **Normalize** — coerce the provider's raw output into a strict, predictable
   response shape, dropping anything extra.
4. **Respond** — return exactly one JSON response with the right status code.

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

**Error responses** return `{ "error": "..." }` with an appropriate status:

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| `400`  | Invalid body, empty/over-length text, or bad language |
| `405`  | Method other than `POST`                              |
| `500`  | Server is missing its provider configuration          |
| `502`  | Provider failed or returned an unusable result        |

## Project structure

```
proxy/
├── api/
│   ├── translate.ts        # Request handler and response pipeline
│   └── _lib/
│       ├── contract.ts     # Shared request/response types and constants
│       ├── validate.ts     # Input validation and normalization
│       ├── provider.ts     # Provider interface + Gemini implementation
│       └── normalize.ts    # Coerces provider output into the contract shape
└── vercel.json             # Serverless function configuration
```

## Design highlights

- **Key stays server-side.** The API key is read only from an environment
  variable and is never logged or included in any response.
- **Swappable provider.** The rest of the code depends only on a small
  `TranslationProvider` interface, so changing the AI backend is a single-file
  change.
- **Strict, predictable contract.** Both the input and the output are validated
  and normalized, so clients always get one of a well-defined set of responses.

## Running it yourself

The proxy is a TypeScript project deployed as a Vercel serverless function.

```bash
cd proxy
npm install
```

Set your translation provider API key as an environment variable, either in a
local `.env` file or in your Vercel project settings:

```
GEMINI_API_KEY=your-key-here
```

Handy commands:

```bash
npm run typecheck   # type-check the project
npm test            # run the test suite
```

Then deploy the `proxy/` directory to Vercel, or run it locally with the Vercel
CLI.

## License

See the repository for license details.
