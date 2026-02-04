export const THEME_IDS = [
  "forge",
  "ember",
  "ocean",
  "forest",
  "vapor",
  "arctic",
  "lagoon",
  "classic",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeVizColors {
  background: string;
  default: { fill: string; border: string };
  comparing: { fill: string; border: string; glow: string };
  swapping: { fill: string; border: string; glow: string };
  writing: { fill: string; border: string; glow: string };
  sorted: { fill: string; border: string };
  range: { fill: string; glow: string };
}

export interface ThemeUIColors {
  bg: {
    base: string;
    surface: string;
    elevated: string;
    overlay: string;
  };
  border: {
    subtle: string;
    muted: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: {
    base: string;
    hover: string;
  };
}

export interface Theme {
  id: ThemeId;
  name: string;
  ui: ThemeUIColors;
  viz: ThemeVizColors;
}
