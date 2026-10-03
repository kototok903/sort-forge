import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, validateSettings } from "@/settings/types";
import { ARRAY_ORDER_OPTIONS, VALUE_MODE_OPTIONS } from "@/config";

const context = { pregenAlgorithms: [], liveAlgorithms: [] };

describe("algorithm size limits", () => {
  const loaded = {
    pregenAlgorithms: ["bubble", "stooge"],
    liveAlgorithms: ["bubble"],
    pregenAlgorithmMetadata: [
      { id: "bubble", maxArraySize: null },
      { id: "stooge", maxArraySize: 32 },
    ],
  };

  test("restored settings clamp after metadata loads, including inactive pregen", () => {
    const pending = validateSettings(
      { engineType: "live", pregenAlgorithm: "stooge", pregenArraySize: 128 },
      context
    );
    expect(pending.pregenArraySize).toBe(128);
    const settings = validateSettings(pending, loaded);
    expect(settings.pregenArraySize).toBe(32);
    expect(settings.liveArraySize).toBe(DEFAULT_SETTINGS.liveArraySize);
    expect(validateSettings(settings, loaded)).toEqual(settings);
  });

  test("selection clamps oversized sizes and preserves smaller choices", () => {
    const settings = validateSettings(
      { pregenAlgorithm: "bubble", pregenArraySize: 128 },
      loaded
    );
    const limited = validateSettings(
      { ...settings, pregenAlgorithm: "stooge" },
      loaded
    );
    expect(limited.pregenArraySize).toBe(32);
    expect(
      validateSettings({ ...limited, pregenAlgorithm: "bubble" }, loaded)
        .pregenArraySize
    ).toBe(32);
    expect(
      validateSettings({ ...limited, pregenArraySize: 12 }, loaded)
        .pregenArraySize
    ).toBe(12);
  });
});

describe("array generation settings", () => {
  test("defaults to All unique values in Random order", () => {
    const settings = validateSettings(null, context);
    expect(settings.valueMode).toBe("all-unique");
    expect(settings.arrayOrder).toBe("random");
  });

  test("validates every combination of new saved settings", () => {
    for (const { value: valueMode } of VALUE_MODE_OPTIONS) {
      for (const { value: arrayOrder } of ARRAY_ORDER_OPTIONS) {
        const settings = validateSettings({ valueMode, arrayOrder }, context);
        expect(settings.valueMode).toBe(valueMode);
        expect(settings.arrayOrder).toBe(arrayOrder);
      }
    }
  });

  test("invalid fields fall back independently to defaults", () => {
    expect(
      validateSettings({ valueMode: "invalid", arrayOrder: "valley" }, context)
    ).toMatchObject({
      valueMode: DEFAULT_SETTINGS.valueMode,
      arrayOrder: "valley",
    });
    expect(
      validateSettings({ valueMode: "few-unique", arrayOrder: null }, context)
    ).toMatchObject({
      valueMode: "few-unique",
      arrayOrder: DEFAULT_SETTINGS.arrayOrder,
    });
  });

  test("ignores old distribution settings while retaining other preferences", () => {
    const settings = validateSettings(
      { distribution: "random", pregenArraySize: 32, soundVolume: 0.25 },
      context
    );
    expect(settings).toMatchObject({
      valueMode: "all-unique",
      arrayOrder: "random",
      pregenArraySize: 32,
      soundVolume: 0.25,
    });
    expect(settings).not.toHaveProperty("distribution");
  });
});
