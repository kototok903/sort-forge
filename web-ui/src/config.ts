export type EngineType = "pregen" | "live";
export const ENGINE_DEFAULT: EngineType = "pregen";

// V1 Pregen engine limits
export const PREGEN_ARRAY_SIZE_MIN = 5;
export const PREGEN_ARRAY_SIZE_MAX = 256;
export const PREGEN_ARRAY_SIZE_DEFAULT = 128;

// V2 Live engine limits
export const LIVE_ARRAY_SIZE_MIN = 5;
export const LIVE_ARRAY_SIZE_MAX = 100000;
export const LIVE_ARRAY_SIZE_DEFAULT = 1000;

// Generic constants (use pregen values for backwards compatibility)
export const ARRAY_SIZE_DEFAULT = PREGEN_ARRAY_SIZE_DEFAULT;
export const ARRAY_SIZE_MIN = PREGEN_ARRAY_SIZE_MIN;
export const ARRAY_SIZE_MAX = PREGEN_ARRAY_SIZE_MAX;

export type Distribution = "random" | "uniform";
export const DISTRIBUTION_DEFAULT: Distribution = "uniform";

export const RANDOM_VALUE_MIN = 1;
export const RANDOM_VALUE_MAX = 100;

export const SPEED_DEFAULT = 1;
export const SPEED_MIN = 0.1;
export const SPEED_MAX = 10;
export const SPEED_STEP = 0.1;

export const BASE_EVENTS_PER_SECOND = 60;
