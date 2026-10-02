import { describe, expect, test } from "bun:test";
import { generateArray } from "@/lib/array-generation";
import {
  ARRAY_ORDER_OPTIONS,
  VALUE_MODE_OPTIONS,
  LIVE_ARRAY_SIZE_MAX,
} from "@/config";

function seededRandom() {
  let state = 42;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const ascending = (array) =>
  array.every((value, i) => i === 0 || array[i - 1] <= value);
const descending = (array) =>
  array.every((value, i) => i === 0 || array[i - 1] >= value);

describe("array generation", () => {
  for (const { value: values } of VALUE_MODE_OPTIONS) {
    for (const { value: order } of ARRAY_ORDER_OPTIONS) {
      test(`${values} / ${order}: preserves values and produces the requested shape`, () => {
        for (const size of [0, 1, 2, 4, 5, 6, 17, 128]) {
          const baseline = generateArray(
            { size, values, order: "sorted" },
            seededRandom()
          );
          const array = generateArray({ size, values, order }, seededRandom());
          expect(array).toHaveLength(size);
          expect([...array].sort((a, b) => a - b)).toEqual(baseline);
          expect(
            array.every((value) => Number.isInteger(value) && value > 0)
          ).toBe(true);
          if (order === "sorted") expect(ascending(array)).toBe(true);
          if (order === "reversed") expect(descending(array)).toBe(true);
          if (order === "mountain" || order === "valley") {
            const middle = Math.floor(size / 2);
            const left = array.slice(0, middle + 1);
            const right = array.slice(middle);
            expect(
              order === "mountain" ? ascending(left) : descending(left)
            ).toBe(true);
            expect(
              order === "mountain" ? descending(right) : ascending(right)
            ).toBe(true);
          }
          if (order === "nearly-sorted") {
            const changed = array.filter(
              (value, i) => value !== baseline[i]
            ).length;
            expect(changed).toBeLessThanOrEqual(2 * Math.ceil(size * 0.05));
          }
        }
      });
    }
  }

  test("All unique contains each integer from 1 to size exactly once", () => {
    expect(
      generateArray({ size: 6, values: "all-unique", order: "sorted" })
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("Few unique is balanced, spans the value range, and caps unique values at five", () => {
    for (const size of [1, 2, 4, 5, 6, 17, 128]) {
      const array = generateArray({
        size,
        values: "few-unique",
        order: "sorted",
      });
      const unique = [...new Set(array)];
      expect(unique).toHaveLength(Math.min(5, size));
      expect(unique[0]).toBe(1);
      expect(unique.at(-1)).toBe(size);
      const counts = unique.map(
        (value) => array.filter((item) => item === value).length
      );
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  test("One unique produces one repeated positive value", () => {
    const array = generateArray({
      size: 17,
      values: "one-unique",
      order: "random",
    });
    expect(new Set(array).size).toBe(1);
    expect(array[0]).toBeGreaterThan(0);
  });

  test("Random values include both boundaries of the existing 1–100 range", () => {
    let high = false;
    expect(
      generateArray({ size: 4, values: "random", order: "random" }, () => {
        high = !high;
        return high ? 0.99999 : 0;
      })
    ).toEqual([100, 1, 100, 1]);
  });

  test("Random order shuffles, and injected randomness makes generation reproducible", () => {
    const options = { size: 128, values: "all-unique", order: "random" };
    const array = generateArray(options, seededRandom());
    expect(array).toEqual(generateArray(options, seededRandom()));
    expect(ascending(array)).toBe(false);
  });

  test("Nearly sorted makes a local change on unique values", () => {
    expect(
      generateArray(
        { size: 6, values: "all-unique", order: "nearly-sorted" },
        () => 0.5
      )
    ).toEqual([1, 2, 4, 3, 5, 6]);
  });

  test("the maximum live array size supports structured and random values", () => {
    for (const values of ["all-unique", "random"]) {
      const array = generateArray(
        { size: LIVE_ARRAY_SIZE_MAX, values, order: "mountain" },
        seededRandom()
      );
      expect(array).toHaveLength(LIVE_ARRAY_SIZE_MAX);
      const middle = Math.floor(array.length / 2);
      expect(ascending(array.slice(0, middle + 1))).toBe(true);
      expect(descending(array.slice(middle))).toBe(true);
    }
  });
});
