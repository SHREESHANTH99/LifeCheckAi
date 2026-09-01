# unslop-ui

Read this first. This file does two narrow things: it removes the specific cues that
make a site read as AI-generated, and it forces a deliberate, project-specific choice
where the model would otherwise reach for its default. Taste and layout judgment remain
yours. A guardrail is not a designer.

Use this file whenever building, styling, reviewing, refactoring, or auditing any page
in this codebase. Trigger it especially when the user says "does this look AI-made,"
"de-slop this," or mentions generic, vibe-coded, or Tailwind-default UI.

---

## LifeCheck AI design brief (locked — do not override)

This project has an established design language. These are real decisions, not defaults.
Do not flag them; they carry `unslop-ignore` status by virtue of being documented here.

- **Background**: `#18181b` charcoal — not a generic dark theme, a specific deliberate choice
- **Accent**: `#4FA8C4` muted teal — not indigo/violet/purple, not emerald, not the shadcn default
- **Font**: `Outfit` — not Inter, not Geist, not Instrument Serif. A real choice.
- **Mono**: `JetBrains Mono` — for data values and code
- **Status colors**: `#10B981` safe / `#F59E0B` caution / `#EF4444` danger — functional only, never decorative
- **Motion**: critically-damped spring `{ type: "spring", stiffness: 120, damping: 24, mass: 0.8 }` — no bounce, no overshoot
- **Noise overlay**: global subtle grain at 3% opacity — deliberate texture, not a background gradient
- **Reference aesthetic**: calm, trustworthy, data-forward — similar to Linear or Vercel's dashboard

Any suggestion that contradicts this brief is not a fix. It is a new default.

---

## The trap to avoid

The failure mode of every anti-slop effort is replacing one default with another.
Do not swap violet gradient for sage green and cream. Do not replace Inter with
Fraunces. Do not replace `rounded-2xl` with sharp corners as a blanket rule.
Every replacement must be anchored to the project brief above.

---

## Mode 1: Build

Before generating any UI component or page for this project:

1. **Anchor to the brief above** — use `#4FA8C4` teal for interactive accents, `#18181b` charcoal base
2. **Motion**: use the locked spring config; no `whileHover={{ scale: 1.05 }}` on cards
3. **No glow** unless it is a functional status indicator (e.g., the live ping dot on alerts)
4. **Icons**: Lucide only — no emoji as feature icons or section bullets
5. **Layout**: avoid centered-hero + three-card-grid + CTA skeleton. Use asymmetric layouts, real data, real screenshots
6. **Copy**: write what the feature does. Avoid "Transform your X," "Supercharge," "Unleash," "Effortlessly"

---

## Mode 2: Audit

When the user says "does this look AI," "audit," "de-slop," or "check for tells":

Scan: `.html` `.css` `.scss` `.js` `.jsx` `.ts` `.tsx`

For each finding report: **file:line — tell — severity — concrete fix**

Then give a **vibe score** (1-10, where 10 = obviously AI-generated, 1 = indistinguishable from human).

Lead with the verdict and the single highest-impact change. Close with top 3 fixes.

---

## The tells catalog (ranked by Reddit data weight, ~3.2M posts, 3033 complaints)

### CRITICAL (fix first)

**Tell 1 - Default shadcn/Tailwind look** (2.5% of complaints)
- Signatures: `bg-slate-*` / `bg-zinc-*` card surfaces untouched, `--radius: 0.5rem` unedited, stock `rounded-lg border bg-card shadow-sm` repeated unchanged
- Fix: LifeCheck AI already overrides these via `globals.css` theme vars. Verify no component re-introduces `bg-slate-800` or similar

**Tell 2 - AI purple / violet primary** (2.3% of complaints)
- Signatures: `violet-*`, `indigo-*`, `purple-*` as the primary/CTA color; hex `#6366f1`, `#7c3aed`, `#8b5cf6`; `--primary` set to a violet hue (HSL 255-280)
- Fix: Replace with `accent-primary` (`#4FA8C4`). **Exception**: `accent-violet` in this codebase is a secondary label color — verify it is never used as a primary CTA or dominant surface color

**Tell 3 - Gradients everywhere / gradient text** (2.0% of complaints)
- Signatures: `bg-clip-text text-transparent` on headings, `from-purple-* to-blue-*`, `radial-gradient` as background overlays across multiple surfaces
- Fix: Remove gradient text. Decorative `radial-gradient` overlays at <=5% opacity are acceptable as surface texture; gradient fills on buttons or headings are not

### HIGH

**Tell 4 - Too many animations** (1.1% of complaints)
- Signatures: `initial={{ opacity: 0, y: 20 }}` + `whileInView` on every section, `hover:scale-105` on cards, `animate-ping` used decoratively
- Fix: Motion only when it communicates state. `animate-ping` is acceptable on live-status dots (functional). Scroll-reveal on every card is not

**Tell 5 - Neon glow on dark** (0.7% of complaints)
- Signatures: `shadow-[0_0_*]` colored glow on cards, buttons, or text that was not requested; `text-cyan-400` with `box-shadow` glow
- Fix: Remove unprompted glow. Status-colored glow on alert severity badges is functional and acceptable (`shadow-[0_0_8px_rgba(16,185,129,0.4)]` on a safe badge = functional signal). Glow on filter pills, CTA buttons, or arbitrary cards is not

### MEDIUM

**Tell 6 - Rounded corners on everything** (0.8% of complaints)
- Signatures: `rounded-full` on every button; `rounded-2xl` / `rounded-3xl` applied uniformly across cards, inputs, and containers
- Fix: Use the project's `--radius-default: 16px` / `--radius-btn: 12px` scale deliberately. `rounded-full` is acceptable for status dots and avatar chips, not for primary action buttons

**Tell 7 - Generic sans font** (0.4% of complaints)
- Signatures: `font-family: Inter` as the only declared face; `--font-family-body: "Inter"` in `:root`
- Fix: This project uses `Outfit`. The `globals.css` `:root` block declares `--font-family-body: 'Inter'` but the `@import` at line 1 loads `Outfit`. The CSS variable is wrong and needs updating to `'Outfit'`.

**Tell 8 - Emoji as icons** (0.5% of complaints)
- Signatures: rocket/sparkle/lightning/lock emoji in `h1`/`h2`, feature card titles, or list bullets
- Fix: Lucide icons only. Emoji in body copy where a human would write one is fine

### LOW (fix if cheap)

**Tell 9 - Hero + three cards + CTA skeleton** (0.4% of complaints)
- Signatures: `text-center` hero with large headline + two buttons + `grid-cols-3` feature cards
- Note: LifeCheck AI's landing page uses a city-search hero, check that it does not fall into the three-card skeleton below the fold

**Tell 10 - Copy cliches**
- Banned: "Transform your X," "Supercharge," "Unleash," "Effortlessly," "Your X, reimagined," "cutting-edge," "revolutionary," "game-changing"
- Fix: Write what the feature literally does

---

## What this deliberately does not flag

- `accent-violet` used as a **secondary** label/tag color -- it is a deliberate project token
- `rounded-2xl` on card containers -- within the project's radius scale
- Dark mode -- only unprompted glow is a tell, not dark backgrounds
- Glassmorphism -- contested in the data, allowed
- `animate-ping` on live status dots -- functional, not decorative
- `shadow-glow` on severity badges -- functional status signal
- Noise overlay on body -- deliberate texture decision

---

## Reporting format

```
VERDICT: [one sentence]

FINDINGS:
[severity] file:line -- [tell name] -- [concrete fix]

VIBE SCORE: X/10
TOP 3 FIXES: ...
```
