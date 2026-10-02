import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, validateSettings } from "@/settings/types";
import { ARRAY_ORDER_OPTIONS, VALUE_MODE_OPTIONS } from "@/config";

const context = { pregenAlgorithms: [], liveAlgorithms: [] };

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
