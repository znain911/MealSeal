# Prompt for Claude (Design) — MealSeal

Paste everything below into Claude Design as one prompt.

---

I'm building **MealSeal**, a mobile-first charitable food-voucher platform with two logged-in roles — **charity administrator** and **café staff** — plus a third role (**recipient**) who never opens the app, only receives a QR voucher as an image/PDF.

Design a complete low-fidelity-to-mid-fidelity mobile UI system for this product using the design tokens and rules below. Treat the tokens as fixed — don't invent a new palette or type scale, apply this one consistently across every screen.

## Design tokens (use exactly these)

**Color — light mode**
- Canvas (app background): `#FBF7F0`
- Surface (cards/inputs): `#FFFFFF`
- Surface sunken (nested panels): `#F3ECE1`
- Ink (primary text): `#2B2622`
- Ink secondary: `#5E554B`
- Ink tertiary (placeholders/captions): `#776D62`
- Border: `#E4DCCC`
- Border strong: `#C9BFB1`
- Primary (buttons/links/brand): `#1F5C46`
- Primary pressed: `#153F30`
- Primary subtle (tinted bg): `#E3F1E7`
- Accent clay (sparing warmth accent, onboarding/illustration only): `#B4532A`

**Color — dark mode**
- Canvas: `#1A1714` · Surface: `#241F1A` · Ink: `#F4EFE6` · Ink secondary: `#B5AC9F` · Primary: `#8FD1AE` (text-on-primary `#1A1714`)

**Status colors — exactly 5 statuses, each a background+text pair, always shown with an icon AND a text label, never color alone:**
| Status | Background | Text | Example label |
|---|---|---|---|
| Verified / Valid | `#E3F1E7` | `#1D6B47` | "Voucher verified" |
| Redeemed / Used | `#ECEBF6` | `#4A4A8A` | "Meal redeemed" |
| Caution / Pending | `#FCEFD6` | `#8A5300` | "Expiring soon" |
| Stop / Invalid | `#FBE7E3` | `#A3312A` | "No longer valid" |
| Info / Neutral | `#E6EFF5` | `#2F5A7A` | network/system messages |

**Typography** — one humanist sans-serif family, weights 500/600/700 only:
- Display 32/40 · Title 24/32 · Heading 18/26 · Body 16/24 · Body secondary 14/20 · Caption 12/16 (uppercase, +0.4 tracking) · Button 16/24 (weight 700)

**Spacing** — 4px base unit: 4, 8, 12, 16, 24, 32, 48. Screen horizontal padding 16. Card padding 16. Field gap 12. Section gap 24.

**Radius** — 10 (chips/small buttons) · 16 (inputs/list rows) · 20 (cards/sheets) · full/999 (pills, seal badge, FAB)

**Elevation** — flat by default (1px `#E4DCCC` border separators); one soft shadow only, for raised cards: `0 2px 12px rgba(43,38,34,0.06)`.

**Icons** — outline style, 1.5px stroke, rounded joins (Phosphor/Lucide-style). Brand mark is a soft rounded seal/shield (not a padlock). No emoji as icons.

**Motion** — gentle check animation on redeem success (icon scales 0.8→1.0 with slight overshoot, ~320ms ease-out); state transitions cross-fade + 8px slide, ~200ms; respect reduced-motion (fallback to 100ms fade).

## Visual tone
Soothing, warm, dignified, inclusive, trustworthy, non-judgmental, practical. Rounded soft surfaces, generous whitespace, calm micro-motion. Explicitly avoid: fintech/banking harshness, hacker/cyber visuals, over-technical dashboards, cluttered enterprise admin aesthetics.

## Security messaging rules (for any copy on these screens)
- DO say: vouchers are digitally signed; the secure backend checks authenticity; redeemable only once; revoked/expired vouchers are rejected; modified or invalid QR codes are rejected; assigned café is checked before redemption.
- DO NOT say the QR is "encrypted," and don't use heavy technical security jargon in UI copy.

## Screens to design (~12 core + required states)

1. Splash screen
2. Interactive first-time onboarding (explains: charity creates a voucher → a secure QR is generated and shared → café staff verify it before giving the meal → every voucher is protected against tampering and repeat use)
3. Sign-in (Firebase-backed, single email/password form, role-aware redirect)
4. Charity administrator dashboard
5. Create voucher form (voucher ID/reference, recipient reference, assigned café, food item/meal type, quantity, issue date, expiry date)
6. Review & confirm voucher (before signing/generating)
7. Generated QR voucher + share sheet (share as image/PDF)
8. Voucher history with filtering (by status/café/date)
9. Voucher details + revoke action
10. Café staff dashboard
11. QR scanner screen
12. Verification & redemption result screen

**Also design these result/edge states on screen 12 (or as a shared result pattern):**
- Valid voucher (ready to redeem)
- Successfully redeemed
- Already redeemed
- Expired or revoked
- Wrong café assigned
- Invalid or modified QR code
- Network / server error

## Other requirements
- Mobile-first, portrait, large tap targets (min 44×44px, buttons 52px tall)
- High-contrast text pairings only (WCAG AA, 4.5:1+ for body text) — treat the token pairs above as pre-checked, don't substitute lower-contrast variants
- Status is always icon + color + text label together, never color alone
- Design for stressed/time-poor users: minimal steps, clear primary action per screen, forgiving error recovery copy (see tone examples: "Connection problem — please try again in a moment")

Please deliver: the full screen set in the visual direction above, using the exact tokens given, in a cohesive mobile UI kit I can then hand to engineering.
