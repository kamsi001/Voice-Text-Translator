/**
 * Unit + property tests for `validateInput` (task 1.3).
 *
 * Covers the length bound (Property 5) and the case-insensitive language
 * allowlist with canonical normalization (Property 4), plus the malformed-body
 * and missing/non-string field edge cases.
 *
 * Framework: Vitest. Property tests use fast-check.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateInput } from "./validate.js";
import { MAX_TEXT_LENGTH, SUPPORTED_LANGUAGES } from "./contract.js";

/** Helper: build a body with a valid language so text-only cases isolate text checks. */
function withText(text: unknown) {
  return { text, targetLanguage: "Spanish" };
}

/** Helper: build a body with valid text so language-only cases isolate language checks. */
function withLanguage(targetLanguage: unknown) {
  return { text: "hello", targetLanguage };
}

describe("validateInput — malformed body", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["a string", "not an object"],
    ["a boolean", true],
  ])("rejects a non-object body (%s)", (_label, body) => {
    const result = validateInput(body as unknown);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });
});

describe("validateInput — text validation", () => {
  it("rejects an empty string text", () => {
    const result = validateInput(withText(""));
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only text", () => {
    const result = validateInput(withText("   \t\n  "));
    expect(result.ok).toBe(false);
  });

  it("rejects missing text", () => {
    const result = validateInput({ targetLanguage: "Spanish" });
    expect(result.ok).toBe(false);
  });

  it.each([
    ["a number", 123],
    ["null", null],
    ["an object", {}],
    ["an array", ["hi"]],
  ])("rejects non-string text (%s)", (_label, text) => {
    const result = validateInput(withText(text));
    expect(result.ok).toBe(false);
  });

  it("accepts text of exactly MAX_TEXT_LENGTH characters", () => {
    const text = "a".repeat(MAX_TEXT_LENGTH);
    const result = validateInput(withText(text));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toHaveLength(MAX_TEXT_LENGTH);
  });

  it("rejects text of MAX_TEXT_LENGTH + 1 characters", () => {
    const text = "a".repeat(MAX_TEXT_LENGTH + 1);
    const result = validateInput(withText(text));
    expect(result.ok).toBe(false);
  });

  it("returns the trimmed text on success", () => {
    const result = validateInput(withText("  hello world  "));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toBe("hello world");
  });
});

describe("validateInput — language validation", () => {
  it.each(SUPPORTED_LANGUAGES)(
    "accepts supported language %s in mixed case and returns canonical casing",
    (canonical) => {
      const mixed = canonical
        .split("")
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join("");
      const result = validateInput(withLanguage(mixed));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.targetLanguage).toBe(canonical);
    },
  );

  it("accepts a supported language in all-upper case", () => {
    const result = validateInput(withLanguage("FRENCH"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.targetLanguage).toBe("French");
  });

  it("rejects an unsupported language", () => {
    const result = validateInput(withLanguage("Klingon"));
    expect(result.ok).toBe(false);
  });

  it("rejects missing targetLanguage", () => {
    const result = validateInput({ text: "hello" });
    expect(result.ok).toBe(false);
  });

  it.each([
    ["a number", 7],
    ["null", null],
    ["an object", {}],
  ])("rejects non-string targetLanguage (%s)", (_label, targetLanguage) => {
    const result = validateInput(withLanguage(targetLanguage));
    expect(result.ok).toBe(false);
  });
});

describe("validateInput — Property 5: Length bound", () => {
  // **Validates: Requirements 7.2, 8.4**
  it("accepts iff trimmed text is non-empty and length ≤ MAX_TEXT_LENGTH", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = validateInput({ text, targetLanguage: "Spanish" });
        const trimmed = text.trim();
        const shouldAccept =
          trimmed.length > 0 && text.length <= MAX_TEXT_LENGTH;
        expect(result.ok).toBe(shouldAccept);
        if (result.ok) {
          expect(result.value.text).toBe(trimmed);
          expect(result.value.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
        }
      }),
    );
  });

  it("never accepts text whose raw length exceeds MAX_TEXT_LENGTH", () => {
    fc.assert(
      fc.property(fc.string({ minLength: MAX_TEXT_LENGTH + 1 }), (text) => {
        const result = validateInput({ text, targetLanguage: "Spanish" });
        expect(result.ok).toBe(false);
      }),
    );
  });
});

describe("validateInput — Property 4: Language allowlist", () => {
  // **Validates: Requirements 3.1, 7.3, 8.4**
  it("accepts any casing of a supported language and normalizes to canonical", () => {
    // Pick a supported language, then generate a random-cased variant of it,
    // carrying the canonical value alongside so we can assert normalization.
    const casedLanguage = fc
      .constantFrom(...SUPPORTED_LANGUAGES)
      .chain((canonical) =>
        fc
          .array(fc.boolean(), {
            minLength: canonical.length,
            maxLength: canonical.length,
          })
          .map((flags) => ({
            canonical,
            mixed: canonical
              .split("")
              .map((c, i) => (flags[i] ? c.toUpperCase() : c.toLowerCase()))
              .join(""),
          })),
      );

    fc.assert(
      fc.property(casedLanguage, ({ canonical, mixed }) => {
        const result = validateInput({ text: "hello", targetLanguage: mixed });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.targetLanguage).toBe(canonical);
      }),
    );
  });

  it("rejects strings that are not in the allowlist (case-insensitively)", () => {
    const allowed = new Set(SUPPORTED_LANGUAGES.map((l) => l.toLowerCase()));
    fc.assert(
      fc.property(fc.string(), (lang) => {
        fc.pre(!allowed.has(lang.trim().toLowerCase()));
        const result = validateInput({ text: "hello", targetLanguage: lang });
        expect(result.ok).toBe(false);
      }),
    );
  });
});
