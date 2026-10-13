# Vital ID — brand guidelines

The public brand kit lives at [vitalid.site/brand](https://www.vitalid.site/brand) (`app/brand`, `components/brand/BrandKit.tsx`). Its assets are in [`public/brand/`](../public/brand); the 3D crew artwork is the app's own, in `public/companions/` and `public/coach/`. Design tokens are in `app/globals.css`.

**Idea:** *Your health. In your hands.* The person is in control, not the app.

## Logo

A heart with a leaf: health and natural wellbeing in one shape.

| File (`public/brand/logos/`) | Use |
|---|---|
| `logo-mark-green.svg` | Mark on `canvas` or white |
| `logo-mark-white.svg` | Mark on `brand` or the hero-green gradient (leaf in `mint`) |
| `logo-mark-ink.svg` | One-colour print only |
| `app-icon.svg` | Avatars, favicon, app tile (`brand` square, radius 11/48) |
| `logo-horizontal-green.svg` | Lockup with tagline, light backgrounds |
| `logo-horizontal-white.svg` | Lockup with tagline, green backgrounds |

- Write the name **Vital ID**: two words, "ID" in capitals. Never "VitalID", "Vital Id" or "VID".
- Clear space: half the mark's height on every side. Minimum 20 px tall on screen.
- Do not recolour beyond the three versions, rotate, add shadows or replace the leaf.
- The lockup text is outlined, so the SVGs render the same without fonts installed.

## Colour

| Token | Hex | Use |
|---|---|---|
| `brand` | `#0e7a5f` | Logo, primary action (one per view), links |
| `brand-deep` | `#0a5c48` | Pressed states, credential waves |
| hero top → bottom | `#164d40` → `#0b3229` | Identity gradient at 140° (credential, covers, dark posts) |
| `mint` | `#b7e4c7` | Leaf on green, credential ID; never text on white |
| `brand-soft` | `#e8f3ef` | Tinted chips, active navigation |
| `canvas` | `#f5f5f7` | Page background |
| `ink` | `#1d1d1f` | Text |
| `coral` | `#ff8a7a` | Mascot warmth only; never a status |

Status colours (`good`, `warn`, `bad`) always sit on their `-soft` background and always carry the word (Stable, Improving, Declining, Unusual).

## Type

The system sans (SF Pro on Apple, Segoe UI on Windows, Noto Sans Arabic for Arabic). No fonts are bundled. In design tools without SF Pro, use Inter. Headlines are tight (−0.04 em) at weight 650–700; marketing headlines put the second line in `brand` (or `mint` on green). Numbers are tabular.

## The crew

| Character | File | Stands for |
|---|---|---|
| Heart | `public/companions/heart.png` | Health |
| Broccoli | `public/brand/crew/nutrition.svg` | Nutrition |
| Dumbbell | `public/companions/dumbbell.png` | Movement |
| Moon | `public/companions/moon.png` | Rest |
| Lotus | `public/brand/crew/mindfulness.svg` | Mindfulness |
| Drop | `public/brand/crew/hydration.svg` | Hydration |
| Shield | `public/companions/shield.png` | Privacy and sharing |
| Muscle | `public/companions/muscle.png` | Strength |
| Coach | `public/coach/doctor.png` | Rule-based guidance |

PNGs are 3D, SVGs are flat; put the flat ones inside tinted tiles. Motion is gentle (float, breathe, bounce) and respects `prefers-reduced-motion`. Never show the crew sad or ill, or use them for clinical messages.

## Voice

Clear, warm and precise. Short sentences, second person, sentence case, no emoji in the product.

Canonical lines: *Your health. In your hands.* · *Your portable health identity* · *Health has a new identity* · *Share only what you choose, for as long as you choose.* Arabic: *صحتك. بين يديك.* · *هويتك الصحية المحمولة*.

Never claim:

- that Vital ID is a medical device or gives medical advice;
- that the Coach is AI or a doctor (it is rule-based);
- integrations beyond WHOOP (others are "coming soon");
- that revoking erases copies already saved (it stops new reads);
- identity verification or insurer integrations;
- a native app or offline mode (Vital ID is a web experience).

Sample data is always labelled **DEMO** or *Sample data*; the demo person, Fátima, is synthetic.

## Launch series

`public/brand/social/01–06` — six Instagram posts at 4:5 (1080 × 1350), each an 8-second MP4 loop with a PNG cover:

1. Health has a new identity
2. Your health lives everywhere
3. One card. Your whole picture
4. Share 3 facts. For 1 hour
5. Meet the crew
6. Your health. In your hands

Alternate light and dark posts in the grid. Every post carries the mark top-left and `vitalid.site` at the bottom.
