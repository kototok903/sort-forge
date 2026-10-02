import {
  RANDOM_VALUE_MIN,
  RANDOM_VALUE_MAX,
  type ValueMode,
  type ArrayOrder,
} from "@/config";

interface ArrayGenerationOptions {
  size: number;
  values: ValueMode;
  order: ArrayOrder;
}

type RandomSource = () => number;

/** Generate values, then arrange them without changing their multiplicities. */
export function generateArray(
  { size, values, order }: ArrayGenerationOptions,
  rng: RandomSource = Math.random
): number[] {
  const array = generateValues(size, values, rng);
  return applyOrder(array, values, order, rng);
}

function generateValues(
  size: number,
  mode: ValueMode,
  rng: RandomSource
): number[] {
  switch (mode) {
    case "all-unique":
      return Array.from({ length: size }, (_, index) => index + 1);
    case "random": {
      const range = RANDOM_VALUE_MAX - RANDOM_VALUE_MIN + 1;
      return Array.from(
        { length: size },
        () => Math.floor(rng() * range) + RANDOM_VALUE_MIN
      );
    }
    case "few-unique": {
      const count = Math.min(5, size);
      // Balanced runs of up to five values spanning the same range as All unique.
      return Array.from({ length: size }, (_, index) => {
        const group = Math.floor((index * count) / size);
        return count <= 1
          ? 1
          : 1 + Math.round((group * (size - 1)) / (count - 1));
      });
    }
    case "one-unique":
      return Array(size).fill(Math.max(1, Math.ceil(size / 2)));
  }
}

function applyOrder(
  array: number[],
  mode: ValueMode,
  order: ArrayOrder,
  rng: RandomSource
): number[] {
  if (order === "random") {
    // Independently sampled random values already have random order.
    if (mode !== "random") {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    return array;
  }

  // Other value modes are created sorted. Counting sort keeps random values
  // linear in array size, including at the live engine's million-element limit.
  if (mode === "random") {
    const counts = new Uint32Array(RANDOM_VALUE_MAX - RANDOM_VALUE_MIN + 1);
    for (const value of array) counts[value - RANDOM_VALUE_MIN]++;
    let index = 0;
    for (let value = 0; value < counts.length; value++) {
      for (let count = counts[value]; count > 0; count--) {
        array[index++] = value + RANDOM_VALUE_MIN;
      }
    }
  }

  switch (order) {
    case "sorted":
      return array;
    case "reversed":
      return array.reverse();
    case "nearly-sorted": {
      // About 5% adjacent swaps: local disruption without distant outliers.
      if (array.length > 1) {
        const swaps = Math.ceil(array.length * 0.05);
        for (let swap = 0; swap < swaps; swap++) {
          const i = Math.floor(rng() * (array.length - 1));
          [array[i], array[i + 1]] = [array[i + 1], array[i]];
        }
      }
      return array;
    }
    case "mountain":
    case "valley": {
      // Fill alternating ends toward the center, preserving odd sizes and ties.
      // Mountain: [1, 3, 5, 4, 2]; Valley: [5, 3, 1, 2, 4].
      const arranged = new Array<number>(array.length);
      let left = 0;
      let right = array.length - 1;
      for (let i = 0; i < array.length; i++) {
        const value = array[order === "mountain" ? i : array.length - 1 - i];
        if (i % 2 === 0) arranged[left++] = value;
        else arranged[right--] = value;
      }
      return arranged;
    }
  }
}
