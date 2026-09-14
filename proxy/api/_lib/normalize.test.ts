/**
 * Unit + property tests for `normalizeResponse`. Uses Vitest and fast-check.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizeResponse } from "./normalize.js";

const CONTRACT_KEYS = ["translation", "pronunciation", "context"] as const;

describe("normalizeResponse — valid input", () => {
  it("accepts a well-formed payload and returns exactly the three contract fields", () => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation: "OH-lah",
      context: "A casual greeting.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        translation: "Hola",
        pronunciation: "OH-lah",
        context: "A casual greeting.",
      });
      expect(Object.keys(result.value).sort()).toEqual(
        [...CONTRACT_KEYS].sort(),
      );
    }
  });

  it("allows empty pronunciation and context (only translation must be non-empty)", () => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation: "",
      context: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        translation: "Hola",
        pronunciation: "",
        context: "",
      });
    }
  });
});

describe("normalizeResponse — missing fields", () => {
  it("rejects a payload missing translation", () => {
    const result = normalizeResponse({
      pronunciation: "OH-lah",
      context: "greeting",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a payload missing pronunciation", () => {
    const result = normalizeResponse({
      translation: "Hola",
      context: "greeting",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a payload missing context", () => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation: "OH-lah",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(normalizeResponse({}).ok).toBe(false);
  });
});

describe("normalizeResponse — wrong field types", () => {
  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", { nested: true }],
    ["an array", ["Hola"]],
    ["a boolean", true],
    ["undefined", undefined],
  ])("rejects when translation is %s", (_label, translation) => {
    const result = normalizeResponse({
      translation,
      pronunciation: "OH-lah",
      context: "greeting",
    });
    expect(result.ok).toBe(false);
  });

  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", {}],
    ["an array", []],
    ["a boolean", false],
    ["undefined", undefined],
  ])("rejects when pronunciation is %s", (_label, pronunciation) => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation,
      context: "greeting",
    });
    expect(result.ok).toBe(false);
  });

  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", {}],
    ["an array", []],
    ["a boolean", false],
    ["undefined", undefined],
  ])("rejects when context is %s", (_label, context) => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation: "OH-lah",
      context,
    });
    expect(result.ok).toBe(false);
  });
});

describe("normalizeResponse — extra fields dropped", () => {
  it("returns ok and drops every field outside the contract", () => {
    const result = normalizeResponse({
      translation: "Hola",
      pronunciation: "OH-lah",
      context: "A casual greeting.",
      confidence: 0.98,
      model: "gemini-x",
      candidates: [{ raw: "stuff" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual(
        [...CONTRACT_KEYS].sort(),
      );
      expect(result.value).not.toHaveProperty("confidence");
      expect(result.value).not.toHaveProperty("model");
      expect(result.value).not.toHaveProperty("candidates");
    }
  });
});

describe("normalizeResponse — empty translation", () => {
  it("rejects an empty translation string", () => {
    const result = normalizeResponse({
      translation: "",
      pronunciation: "OH-lah",
      context: "greeting",
    });
    expect(result.ok).toBe(false);
  });
});

describe("normalizeResponse — non-object / null raw input", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["a string", "Hola"],
    ["a boolean", true],
    ["an array", ["Hola", "OH-lah", "greeting"]],
  ])("rejects a non-object body (%s)", (_label, raw) => {
    expect(normalizeResponse(raw as unknown).ok).toBe(false);
  });
});

describe("normalizeResponse — contract shape property", () => {
  it("accepts iff translation is a non-empty string and pronunciation/context are strings", () => {
    const fieldArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.constant(null),
      fc.constant(undefined),
      fc.boolean(),
      fc.array(fc.string()),
      fc.record({ x: fc.string() }),
    );

    fc.assert(
      fc.property(
        fieldArb,
        fieldArb,
        fieldArb,
        (translation, pronunciation, context) => {
          const result = normalizeResponse({
            translation,
            pronunciation,
            context,
          });
          const shouldAccept =
            typeof translation === "string" &&
            translation.length > 0 &&
            typeof pronunciation === "string" &&
            typeof context === "string";
          expect(result.ok).toBe(shouldAccept);
        },
      ),
    );
  });

  it("on success returns exactly the three contract fields with the same values, dropping extras", () => {
    const extras = fc.dictionary(
      fc.string().filter((k) => !CONTRACT_KEYS.includes(k as never)),
      fc.anything(),
    );

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.string(),
        extras,
        (translation, pronunciation, context, extra) => {
          const result = normalizeResponse({
            translation,
            pronunciation,
            context,
            ...extra,
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(Object.keys(result.value).sort()).toEqual(
              [...CONTRACT_KEYS].sort(),
            );
            expect(result.value).toEqual({
              translation,
              pronunciation,
              context,
            });
          }
        },
      ),
    );
  });

  it("never accepts non-object input", () => {
    const nonObject = fc.oneof(
      fc.integer(),
      fc.string(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything()),
    );
    fc.assert(
      fc.property(nonObject, (raw) => {
        expect(normalizeResponse(raw as unknown).ok).toBe(false);
      }),
    );
  });
});
