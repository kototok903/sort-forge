export type EngineType = "pregen" | "live";
export const ENGINE_DEFAULT: EngineType = "pregen";

// V1 Pregen engine limits
export const PREGEN_ARRAY_SIZE_MIN = 4;
export const PREGEN_ARRAY_SIZE_MAX = 1024;
export const PREGEN_ARRAY_SIZE_DEFAULT = 128;

// V2 Live engine limits
export const LIVE_ARRAY_SIZE_MIN = 4;
export const LIVE_ARRAY_SIZE_MAX = 1048576;
export const LIVE_ARRAY_SIZE_DEFAULT = 1000;

// Generic constants (use pregen values for backwards compatibility)
export const ARRAY_SIZE_DEFAULT = PREGEN_ARRAY_SIZE_DEFAULT;
export const ARRAY_SIZE_MIN = PREGEN_ARRAY_SIZE_MIN;
export const ARRAY_SIZE_MAX = PREGEN_ARRAY_SIZE_MAX;

export const VALUE_MODE_OPTIONS = [
  { value: "all-unique", label: "All unique" },
  { value: "random", label: "Random" },
  { value: "few-unique", label: "Few unique" },
  { value: "one-unique", label: "One unique" },
] as const;
export type ValueMode = (typeof VALUE_MODE_OPTIONS)[number]["value"];
export const VALUE_MODE_DEFAULT: ValueMode = "all-unique";

export const ARRAY_ORDER_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "sorted", label: "Sorted" },
  { value: "reversed", label: "Reversed" },
  { value: "nearly-sorted", label: "Nearly sorted" },
  { value: "mountain", label: "Mountain" },
  { value: "valley", label: "Valley" },
] as const;
export type ArrayOrder = (typeof ARRAY_ORDER_OPTIONS)[number]["value"];
export const ARRAY_ORDER_DEFAULT: ArrayOrder = "random";

export const RANDOM_VALUE_MIN = 1;
export const RANDOM_VALUE_MAX = 100;

export const SPEED_DEFAULT = 1;
export const SPEED_MIN = 0.1;
export const SPEED_MAX = 10;
export const SPEED_STEP = 0.1;

export const BASE_EVENTS_PER_SECOND = 60;
export const COMPLETION_EVENTS_PER_SECOND = 240;
