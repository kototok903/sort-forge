// web-ui/src/themes/themes.ts

import { THEME_IDS, type Theme, type ThemeId } from "@/themes/types";

export const DEFAULT_THEME_ID: ThemeId = "forge";

/**
 * Check if a string is a valid theme ID.
 */
export function isValidThemeId(id: string): id is ThemeId {
  return THEME_IDS.includes(id as ThemeId);
}

export const THEMES: Record<ThemeId, Theme> = {
  // Forge - Default dark theme
  forge: {
    id: "forge",
    name: "Forge",
    ui: {
      bg: {
        base: "#18181b",
        surface: "#1f1f23",
        elevated: "#27272a",
        overlay: "#303033",
      },
      border: { subtle: "#3f3f46", muted: "#52525b" },
      text: { primary: "#ececef", secondary: "#9898a0", muted: "#6a6a72" },
      accent: { base: "#f59e0b", hover: "#fbbf24" },
    },
    viz: {
      background: "#18181b",
      default: { fill: "#5a5a62", border: "#4a4a52" },
      comparing: {
        fill: "#fbbf24",
        border: "#f59e0b",
        glow: "rgba(251, 191, 36, 0.4)",
      },
      swapping: {
        fill: "#f97316",
        border: "#ea580c",
        glow: "rgba(249, 115, 22, 0.5)",
      },
      writing: {
        fill: "#ef4444",
        border: "#dc2626",
        glow: "rgba(239, 68, 68, 0.5)",
      },
      sorted: { fill: "#60a5fa", border: "#3b82f6" },
      range: { fill: "#60a5fa", glow: "rgba(96, 165, 250, 0.4)" },
    },
  },

  // Ember - Warm, fiery
  ember: {
    id: "ember",
    name: "Ember",
    ui: {
      bg: {
        base: "#1c1412",
        surface: "#231a17",
        elevated: "#2d221e",
        overlay: "#382a25",
      },
      border: { subtle: "#4a3830", muted: "#5c483e" },
      text: { primary: "#f5ebe6", secondary: "#b8a89e", muted: "#8a7a70" },
      accent: { base: "#f97316", hover: "#fb923c" },
    },
    viz: {
      background: "#1c1412",
      default: { fill: "#6b5a52", border: "#5a4a42" },
      comparing: {
        fill: "#fbbf24",
        border: "#f59e0b",
        glow: "rgba(251, 191, 36, 0.4)",
      },
      swapping: {
        fill: "#f97316",
        border: "#ea580c",
        glow: "rgba(249, 115, 22, 0.5)",
      },
      writing: {
        fill: "#ef4444",
        border: "#dc2626",
        glow: "rgba(239, 68, 68, 0.5)",
      },
      sorted: { fill: "#eab308", border: "#ca8a04" },
      range: { fill: "#f97316", glow: "rgba(249, 115, 22, 0.4)" },
    },
  },

  // Ocean - Cool, calm
  ocean: {
    id: "ocean",
    name: "Ocean",
    ui: {
      bg: {
        base: "#0f172a",
        surface: "#1e293b",
        elevated: "#273548",
        overlay: "#334155",
      },
      border: { subtle: "#334155", muted: "#475569" },
      text: { primary: "#e2e8f0", secondary: "#94a3b8", muted: "#64748b" },
      accent: { base: "#0ea5e9", hover: "#38bdf8" },
    },
    viz: {
      background: "#0f172a",
      default: { fill: "#475569", border: "#334155" },
      comparing: {
        fill: "#22d3ee",
        border: "#06b6d4",
        glow: "rgba(34, 211, 238, 0.4)",
      },
      swapping: {
        fill: "#3b82f6",
        border: "#2563eb",
        glow: "rgba(59, 130, 246, 0.5)",
      },
      writing: {
        fill: "#a855f7",
        border: "#9333ea",
        glow: "rgba(168, 85, 247, 0.5)",
      },
      sorted: { fill: "#38bdf8", border: "#0ea5e9" },
      range: { fill: "#0ea5e9", glow: "rgba(14, 165, 233, 0.4)" },
    },
  },

  // Forest - Natural, earthy
  forest: {
    id: "forest",
    name: "Forest",
    ui: {
      bg: {
        base: "#141f14",
        surface: "#1a291a",
        elevated: "#223322",
        overlay: "#2d402d",
      },
      border: { subtle: "#3d5a3d", muted: "#4d6b4d" },
      text: { primary: "#e8f0e8", secondary: "#a8b8a8", muted: "#788878" },
      accent: { base: "#22c55e", hover: "#4ade80" },
    },
    viz: {
      background: "#141f14",
      default: { fill: "#5a6b5a", border: "#4a5a4a" },
      comparing: {
        fill: "#a3e635",
        border: "#84cc16",
        glow: "rgba(163, 230, 53, 0.4)",
      },
      swapping: {
        fill: "#facc15",
        border: "#eab308",
        glow: "rgba(250, 204, 21, 0.5)",
      },
      writing: {
        fill: "#f97316",
        border: "#ea580c",
        glow: "rgba(249, 115, 22, 0.5)",
      },
      sorted: { fill: "#10b981", border: "#059669" },
      range: { fill: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" },
    },
  },

  // Vapor - Synthwave/retro
  vapor: {
    id: "vapor",
    name: "Vapor",
    ui: {
      bg: {
        base: "#1a1025",
        surface: "#251535",
        elevated: "#2f1d42",
        overlay: "#3d2555",
      },
      border: { subtle: "#4a3066", muted: "#5c4080" },
      text: { primary: "#f0e6fa", secondary: "#b8a0d0", muted: "#8070a0" },
      accent: { base: "#e879f9", hover: "#f0abfc" },
    },
    viz: {
      background: "#1a1025",
      default: { fill: "#6b5080", border: "#5a4070" },
      comparing: {
        fill: "#f472b6",
        border: "#ec4899",
        glow: "rgba(244, 114, 182, 0.4)",
      },
      swapping: {
        fill: "#e879f9",
        border: "#d946ef",
        glow: "rgba(232, 121, 249, 0.5)",
      },
      writing: {
        fill: "#ef4444",
        border: "#dc2626",
        glow: "rgba(239, 68, 68, 0.5)",
      },
      sorted: { fill: "#c084fc", border: "#a855f7" },
      range: { fill: "#e879f9", glow: "rgba(232, 121, 249, 0.4)" },
    },
  },

  // Arctic - Clean, minimal
  arctic: {
    id: "arctic",
    name: "Arctic",
    ui: {
      bg: {
        base: "#0a0a0b",
        surface: "#141416",
        elevated: "#1e1e21",
        overlay: "#28282c",
      },
      border: { subtle: "#2e2e33", muted: "#3e3e44" },
      text: { primary: "#fafafa", secondary: "#a0a0a8", muted: "#606068" },
      accent: { base: "#60a5fa", hover: "#93c5fd" },
    },
    viz: {
      background: "#0a0a0b",
      default: { fill: "#52525b", border: "#3f3f46" },
      comparing: {
        fill: "#bfdbfe",
        border: "#93c5fd",
        glow: "rgba(191, 219, 254, 0.3)",
      },
      swapping: {
        fill: "#60a5fa",
        border: "#3b82f6",
        glow: "rgba(96, 165, 250, 0.5)",
      },
      writing: {
        fill: "#818cf8",
        border: "#6366f1",
        glow: "rgba(129, 140, 248, 0.5)",
      },
      sorted: { fill: "#7da8d1", border: "#5b8bb8" },
      range: { fill: "#60a5fa", glow: "rgba(96, 165, 250, 0.4)" },
    },
  },

  // Lagoon - Fresh, airy (light theme)
  lagoon: {
    id: "lagoon",
    name: "Lagoon",
    ui: {
      bg: {
        base: "#e8f4f6",
        surface: "#dceef1",
        elevated: "#cde6ea",
        overlay: "#bedde2",
      },
      border: { subtle: "#a8d0d6", muted: "#88bcc4" },
      text: { primary: "#1a3a3a", secondary: "#3a5a5a", muted: "#5a7a7a" },
      accent: { base: "#0d9488", hover: "#0f766e" },
    },
    viz: {
      background: "#e8f4f6",
      default: { fill: "#7db8b8", border: "#5a9a9a" },
      comparing: {
        fill: "#f08060",
        border: "#d06040",
        glow: "rgba(240, 128, 96, 0.4)",
      },
      swapping: {
        fill: "#d05a3a",
        border: "#b04020",
        glow: "rgba(208, 90, 58, 0.5)",
      },
      writing: {
        fill: "#a03820",
        border: "#802810",
        glow: "rgba(160, 56, 32, 0.5)",
      },
      sorted: { fill: "#3a8a8a", border: "#2a6a6a" },
      range: { fill: "#4a5a5a", glow: "rgba(74, 90, 90, 0.4)" },
    },
  },

  // Classic - Sound of Sorting style
  classic: {
    id: "classic",
    name: "Classic",
    ui: {
      bg: {
        base: "#000000",
        surface: "#0a0a0a",
        elevated: "#151515",
        overlay: "#202020",
      },
      border: { subtle: "#333333", muted: "#444444" },
      text: { primary: "#ffffff", secondary: "#aaaaaa", muted: "#666666" },
      accent: { base: "#ff6666", hover: "#ff8888" },
    },
    viz: {
      background: "#000000",
      default: { fill: "#ffffff", border: "#aaaaaa" },
      comparing: {
        fill: "#ffaaaa",
        border: "#ff8888",
        glow: "rgba(255, 170, 170, 0.3)",
      },
      swapping: {
        fill: "#ff4444",
        border: "#cc3333",
        glow: "rgba(255, 68, 68, 0.4)",
      },
      writing: {
        fill: "#aa2222",
        border: "#881111",
        glow: "rgba(170, 34, 34, 0.4)",
      },
      sorted: { fill: "#44cc44", border: "#33aa33" },
      range: { fill: "#888888", glow: "rgba(136, 136, 136, 0.4)" },
    },
  },
};

/**
 * Apply a theme to the document by setting CSS custom properties.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Backgrounds
  root.style.setProperty("--bg-base", theme.ui.bg.base);
  root.style.setProperty("--bg-surface", theme.ui.bg.surface);
  root.style.setProperty("--bg-elevated", theme.ui.bg.elevated);
  root.style.setProperty("--bg-overlay", theme.ui.bg.overlay);

  // Borders
  root.style.setProperty("--border-subtle", theme.ui.border.subtle);
  root.style.setProperty("--border-muted", theme.ui.border.muted);

  // Text
  root.style.setProperty("--text-primary", theme.ui.text.primary);
  root.style.setProperty("--text-secondary", theme.ui.text.secondary);
  root.style.setProperty("--text-muted", theme.ui.text.muted);

  // Accent
  root.style.setProperty("--accent", theme.ui.accent.base);
  root.style.setProperty("--accent-hover", theme.ui.accent.hover);
}
