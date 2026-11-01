# MealSeal Design System

> Design tokens and system rules only — no implementation code, per project brief. For engineers: translate the tables below into your platform's theme/token file (StyleSheet constants, CSS variables, etc.) when you build.

---

## 1. What the current app actually uses (audit)

The app has an **unused Expo starter theme** (`src/constants/theme.ts`) with light/dark tokens that none of the real screens reference. The actual visual language lives **hard-coded inline** across six screens (`index`, `admin`, `staff`, `create-voucher`, `voucher-qr`, `scan-voucher`), which is why the product currently reads as inconsistent:

| Aspect | What was found |
|---|---|
| Color | **53 distinct hex values** across the app, many near-duplicate greens (`#155E49`, `#183E32`, `#304E42`, `#17765B`, `#16804C`, `#167B4B`, `#12683D`…) with no shared source of truth |
| Status colors | Redefined per-screen: `admin.tsx` uses blue (`#2563EB`) for "redeemed," `scan-voucher.tsx` uses green variants for the same concept — the same status means different colors in different places |
| Type scale | Font sizes set ad hoc per screen (9, 10, 11, 12, 13, 14, 15, 16, 19, 20–45px) with no named scale; only two weights used in practice, `700` and `800`, applied inconsistently |
| Radius | 13 different corner radii (8–25px) with no logic tying radius to component size |
| Spacing | Padding/margin/gap values scattered across ~25 unique numbers, not built from a base unit |
| Icons | No icon set — emoji/glyphs used as icons (`✦` for brand mark, `✓`/`✕` for result states, `←` for back) |
| Dark mode | Not implemented on any real screen (only the dead starter theme has it) |
| Elevation | No shadows used anywhere; flat cards with 1px borders only |
| Accessibility | No defined contrast-checked pairs; placeholder/muted text (`#9AA99E`, `#9BAC9F`) measures **~2.4:1 contrast on white — fails WCAG AA** |

**Conclusion:** there is no real design system today, just screen-by-screen improvisation. The replacement below is a single token source, built to satisfy the brief's tone (soothing, warm, dignified, trustworthy) and its accessibility bar (AA contrast minimum everywhere text appears).

---

## 2. Design principles behind the new system

1. **Warm, not clinical.** Greens and earthy neutrals, not blue/gray fintech palettes — blue is avoided entirely as a status color since it reads as "informational/corporate," not "safe."
2. **One meaning, one color.** Every status (verified, used, caution, stop, info) has exactly one color pairing, used identically everywhere.
3. **Calm hierarchy over density.** A restrained three-level type scale and a 4px-based spacing scale replace ad hoc numbers, so screens feel spacious rather than packed.
4. **Trust through softness, not seals of steel.** Rounded, low-contrast elevation and soft icons (seal/shield/check) replace sharp corners and emoji glyphs.
5. **AA or better, always.** Every text/background pairing below is contrast-checked; none fall under 4.5:1 for body text or 3:1 for large text.

---

## 3. Color tokens

### 3.1 Brand & neutrals (light mode)

| Token | Hex | Contrast on Canvas | Use |
|---|---|---|---|
| `color.canvas` | `#FBF7F0` | — | App background — warm off-white, not sterile white |
| `color.surface` | `#FFFFFF` | — | Cards, sheets, inputs |
| `color.surface.sunken` | `#F3ECE1` | — | Nested panels, code/reference chips |
| `color.ink` | `#2B2622` | 14.0:1 | Primary text |
| `color.ink.secondary` | `#5E554B` | 6.8:1 | Supporting text, labels |
| `color.ink.tertiary` | `#776D62` | 4.7:1 | Placeholder text, timestamps, disabled-adjacent captions |
| `color.border` | `#E4DCCC` | — | Default hairline borders |
| `color.border.strong` | `#C9BFB1` | — | Input focus-adjacent / divider emphasis (decorative only, never carries text) |
| `color.primary` | `#1F5C46` | 7.3:1 | Primary buttons, links, active nav, brand mark |
| `color.primary.pressed` | `#153F30` | 10.4:1 | Pressed/active state of primary |
| `color.primary.subtle` | `#E3F1E7` | — | Primary-tinted backgrounds (selected chips, highlighted rows) |
| `color.accent.clay` | `#B4532A` | 5.0:1 (white text) | Secondary accent — used sparingly for warmth (illustration accents, onboarding), never for status |

### 3.2 Status colors (the only five statuses in the product)

Each status is a **background/text pair** plus a required **text label** — color is never the only signal (brief requirement §14).

| Status | Background | Text/Icon | Contrast | Label text |
|---|---|---|---|---|
| **Verified / Valid** | `#E3F1E7` | `#1D6B47` | 5.6:1 | "Voucher verified" |
| **Redeemed / Used** | `#ECEBF6` | `#4A4A8A` | 6.7:1 | "Meal redeemed" |
| **Caution / Pending** | `#FCEFD6` | `#8A5300` | 5.6:1 | "Expiring soon" / review states |
| **Stop / Invalid** | `#FBE7E3` | `#A3312A` | 5.8:1 | "No longer valid" / errors |
| **Info / Neutral** | `#E6EFF5` | `#2F5A7A` | 6.3:1 | Network/system messages |

Solid-fill variants (for banners/buttons rather than chips) use white text on the saturated tone:

| Status | Solid fill | White-text contrast |
|---|---|---|
| Verified | `#1D6B47` | 6.5:1 |
| Stop | `#A3312A` | 6.9:1 |

> Mapping to backend states: `ACTIVE` → Verified, `REDEEMED` → Redeemed, `REVOKED`/`EXPIRED`/`INVALID_SIGNATURE`/`INVALID_QR` → Stop, `WRONG_RESTAURANT` → Stop (with distinct copy), network/5xx → Info.

### 3.3 Dark mode

| Token | Hex | Contrast |
|---|---|---|
| `color.canvas` (dark) | `#1A1714` | — |
| `color.surface` (dark) | `#241F1A` | — |
| `color.ink` (dark) | `#F4EFE6` | 15.6:1 |
| `color.ink.secondary` (dark) | `#B5AC9F` | 8.0:1 |
| `color.primary` (dark) | `#8FD1AE` | 10.1:1 on canvas |
| text-on-primary (dark) | `#1A1714` | 10.1:1 |

Status pairs invert to ~15–20% opacity fills of the same hues over `#241F1A`, keeping the same text colors lightened by one step (e.g., Verified text becomes `#5FCB95`).

---

## 4. Typography

Single font family (brief: avoid "over-technical" — one friendly, humanist sans, e.g. a rounded-leaning system font), three weights only.

| Token | Size / Line height | Weight | Use |
|---|---|---|---|
| `type.display` | 32 / 40 | 700 | Splash headline, "Voucher ready" success moments |
| `type.title` | 24 / 32 | 700 | Screen titles ("Create voucher", "Scan voucher") |
| `type.heading` | 18 / 26 | 600 | Card headers, section labels |
| `type.body` | 16 / 24 | 500 | Default body text, form labels |
| `type.body.secondary` | 14 / 20 | 500 | Helper text, secondary descriptions |
| `type.caption` | 12 / 16 | 600, uppercase, +0.4 tracking | Status chip labels, metadata tags |
| `type.button` | 16 / 24 | 700 | Button labels |

Replaces the old free-floating 9–45px / weight-700-or-800-only scale with 7 named steps and a defined weight ramp (500/600/700).

---

## 5. Spacing & layout

4px base unit (keeps the one good idea from the dead starter theme, extends it):

| Token | Value |
|---|---|
| `space.xs` | 4 |
| `space.sm` | 8 |
| `space.md` | 12 |
| `space.lg` | 16 |
| `space.xl` | 24 |
| `space.2xl` | 32 |
| `space.3xl` | 48 |

- Screen horizontal padding: `space.lg` (16) on mobile.
- Card internal padding: `space.lg` (16).
- Stack gap between form fields: `space.md` (12).
- Section gap: `space.xl` (24).

## 6. Radius & elevation

| Token | Value | Use |
|---|---|---|
| `radius.sm` | 10 | Chips, badges, small buttons |
| `radius.md` | 16 | Inputs, list rows |
| `radius.lg` | 20 | Cards, sheets |
| `radius.full` | 999 | Pills, avatar/seal badge, FAB |

Replaces 13 ad hoc values with 4. Elevation is soft and rare — one shadow token (`0 2px 12px rgba(43,38,34,0.06)`) for raised cards (QR card, modal), nothing else; flat hairline borders (`color.border`) are the default separator, consistent with the brief's "avoid cluttered enterprise aesthetics."

---

## 7. Iconography & trust symbols

Replace emoji glyphs (`✦ ✓ ✕ ←`) with a consistent **outline icon set, 1.5px stroke, rounded joins** (e.g., Phosphor/Lucide-style):

- **Brand mark:** a soft rounded **seal/shield** glyph (not a lock or padlock — avoids "security hardware" coldness), used wherever `✦ MealSeal` appeared.
- **Verified state:** shield-check, filled in Verified green.
- **Redeemed state:** check-circle, filled in Redeemed violet.
- **Stop state:** circle with a soft X (not a hazard triangle), filled in Stop red.
- **Back navigation:** chevron-left, never the text arrow `←`.
- **Scan:** a simple scan-frame/viewfinder icon.

All status icons are always paired with the text label from §3.2 — never shown alone.

---

## 8. Motion

- **Gentle check animation** on successful redemption: shield/check icon scales 0.8→1.0 with a slight overshoot, 320ms, ease-out — reinforces "safe and done," not "alarm."
- **Status transitions** (scanning → result) cross-fade + 8px slide, 200ms — no hard cuts between states.
- **QR reveal** on voucher creation: fade + scale-up from 0.95, 260ms.
- Respect reduced-motion: all of the above collapse to a 100ms opacity fade.

---

## 9. Components (token-level spec, not code)

| Component | Key tokens |
|---|---|
| **Primary button** | `color.primary` fill, white text `type.button`, `radius.md`, min height 52px (exceeds 44px tap-target minimum) |
| **Secondary button** | `color.surface` fill, 1px `color.border.strong`, `color.primary` text |
| **Status chip** | background/text pair from §3.2, `radius.sm`, `type.caption`, icon + label always together |
| **Input field** | `color.surface`, 1px `color.border`, `radius.md`, 52px height, `color.primary` border on focus, error state uses Stop pair with inline helper text (never color alone) |
| **Voucher card** | `color.surface`, `radius.lg`, soft shadow, status chip top-right, `type.heading` title, `type.body.secondary` detail rows |
| **QR card** | centered QR on `color.surface`, `radius.lg`, generous `space.xl` padding so the code is never cropped when shared as image/PDF |

---

## 10. Accessibility summary

- Every text/background pair above is ≥4.5:1 (body) or ≥3:1 (18px+/bold large text); the old placeholder gray (2.4:1, failing) is replaced by `color.ink.tertiary` at 4.7:1.
- Status is always icon + label + color — never color alone (fixes a real gap: current app has no non-color status signal for colorblind users).
- Minimum tap target 44×44px; buttons specified at 52px height.
- Type scale stays legible at system font-scaling up to 130% without truncation (cards use `flex-wrap`, not fixed single-line truncation, for titles).

---

## 11. Migration note for engineering

Replace `src/constants/theme.ts` with these tokens (it's currently dead code the real screens don't import), then refactor the six screens' inline `StyleSheet.create` blocks to reference the shared tokens instead of local hex/number literals — this is a mechanical follow-up, not a redesign, once the tokens above are approved.
