# SortForge Design System

**Direction:** Functional Warmth — Linear/Cursor-inspired, modern but tool-first

---

## Layout

```
┌──────────────────────────────────────────────────────┬──────────┐
│  SortForge                                        [≡]│          │ ← Header (40px)
├──────────────────────────────────────────────────────┼──────────┤
│                                                      │ ARRAY    │
│                                                      │ ──────   │
│                                                      │ Algo     │
│                    CANVAS                            │ Size     │
│                                                      │ Dist     │
│                                                      │ [Gen]    │
│                                                      │          │
├──────────────────────────────────────────────────────┴──────────┤
│  ⏮ ⏪ ▶ Play ⏩   ════════●════════   247/3892   Speed ─● 1.0x  │ ← Footer (48px)
└─────────────────────────────────────────────────────────────────┘
                                                        ↑
                                                Sidebar (220px)
                                                Collapsible
```

---

## Colors

### Dark Theme (default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#18181b` | Canvas, app background |
| `--bg-surface` | `#1f1f23` | Header, footer, sidebar |
| `--bg-elevated` | `#27272a` | Hover states |
| `--bg-overlay` | `#303033` | Modals, dropdowns |
| `--border-subtle` | `#3f3f46` | Default borders |
| `--border-muted` | `#52525b` | Hover borders |
| `--text-primary` | `#ececef` | Primary content |
| `--text-secondary` | `#9898a0` | Labels |
| `--text-muted` | `#6a6a72` | Hints, disabled |
| `--accent` | `#f59e0b` | Primary actions |
| `--accent-hover` | `#fbbf24` | Hover state |

### Visualization Colors

| State | Fill | Border |
|-------|------|--------|
| Default | `#5a5a62` | `#4a4a52` |
| Comparing | `#fbbf24` | `#f59e0b` |
| Swapping | `#f97316` | `#ea580c` |
| Writing | `#ef4444` | `#dc2626` |
| Sorted | `#22d3ee` | `#06b6d4` |

---

## Typography

| Element | Font | Size |
|---------|------|------|
| UI text | Inter | 14px |
| Labels | Inter | 13px |
| Section headers | Inter | 12px |
| Data/numbers | JetBrains Mono | 13px |

---

## Spacing

- Base unit: 4px
- Sidebar padding: 12px
- Section gap: 16px
- Component gap: 8px
- Label-to-input gap: 4px

---

## Border Radius

- Small (buttons, inputs): 4px
- Medium (panels): 6px
- Large (modals): 8px

---

## Component Sizing

| Component | Size |
|-----------|------|
| Header | 40px |
| Footer | 48px |
| Sidebar | 220px |
| Button height | 28px |
| Input height | 28px |

---

## Theming

Set theme via `data-theme` attribute on `<html>`:

```html
<html data-theme="dark">
```

Toggle in JavaScript:

```typescript
document.documentElement.dataset.theme = 'light';
```

Light theme variables are defined but not yet fully tested.
