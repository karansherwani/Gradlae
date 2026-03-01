# PaceMatch Dark Theme Redesign — Full Implementation Plan

> **Scope:** Visual styling, typography, colors, and UI polish only.  
> **No changes to:** logic, routing, data fetching, API calls, or component structure.  
> **Core direction:** Dark, professional SaaS aesthetic (Linear/Stripe-inspired) anchored to UofA brand.

---

## Phase 0 — Foundation (2 files)

### 0A. `app/globals.css`
**What changes:**
- Replace the second `:root` block (lines 42–101) with the new dark color system
- Add all gradient tokens as CSS custom properties
- Add the full typography scale as utility classes
- Update functional colors (success/error/warning/info) to dark-friendly variants
- Replace shadow tokens with dark-mode-appropriate values
- Keep the Tailwind/shadcn `:root` block (lines 6–40) and `@theme inline` block unchanged — those are for shadcn components

**New tokens added:**
```
--pm-bg: #06142E
--pm-surface: rgba(12, 35, 75, 0.92)
--pm-nav: #0C234B
--pm-navy: #0C234B
--pm-navy-mid: #1A3A6B
--pm-navy-light: #2E5FA3
--pm-red: #AB0520
--pm-red-vivid: #CC1A35
--pm-red-light: #E8405A
--pm-text: #F5F7FA
--pm-text-secondary: #E8ECF2
--pm-text-muted: #8A9BB5
--pm-border: rgba(255, 255, 255, 0.08)
--pm-border-active: rgba(171, 5, 32, 0.5)
--gradient-hero, --gradient-accent, --gradient-card, --gradient-surface, --gradient-glow
--gradient-text-red, --gradient-text-navy
```

### 0B. `app/layout.tsx`
**What changes:**
- Replace `DM Sans` with `Inter` only (weights 400–800) — Inter is the sole web font
- Font family in `:root` becomes `'Proxima Nova', 'Inter', 'Calibri', sans-serif`
- No structural changes

---

## Phase 1 — Landing Page (2 files)

### 1A. `app/styles/landing.module.css` (currently 830 lines)
**What changes:**
- **Container:** `background: var(--pm-bg)`
- **Header:** `background: var(--gradient-surface)` + `1px bottom border rgba(171,5,32,0.4)` + `backdrop-filter: blur(12px)` on scroll-based sticky. Logo gets gradient-text-red. Nav links `color: var(--pm-text)`, hover `color: var(--pm-red-light)` with underline slide-in
- **Hero:** `background: var(--gradient-hero)` + SVG noise texture at 4% opacity + `--gradient-glow` radial centered behind headline. H1 gets `gradient-text-red`, uppercase, 800 weight, clamp sizing. CTA button: `background: var(--gradient-accent)`, white text, `border-radius: 8px`, red glow shadow, hover `scale(1.03)`
- **How It Works:** Dark background, step number circles `var(--gradient-accent)`, card text `var(--pm-text-secondary)`
- **Features grid:** Cards use `var(--gradient-card)` + `1px border var(--pm-border)` + `border-radius: 16px` + `3px top accent` via `var(--gradient-accent)` as `border-image`. Hover: glow + `translateY(-3px)`
- **Stats bar:** `background: var(--pm-navy)` — numbers `var(--pm-text)`, labels `var(--pm-text-muted)`
- **AI Advisor section:** Same gradient-hero background. Glassmorphism preview card updated with dark semi-transparent fill. Tags and course rows use `var(--pm-border)` borders. CTA button style matches hero CTA
- **Testimonials:** Cards get `var(--gradient-card)` background, border, rounded corners. Text on dark
- **Support:** Cards same dark card treatment
- **Final CTA:** `var(--gradient-hero)` with glow behind CTA
- **Footer:** `background: var(--pm-nav)`, text `var(--pm-text-muted)`
- **Modal:** Overlay uses `rgba(6, 20, 46, 0.75)` + `backdrop-filter: blur(6px)`. Modal card: `var(--gradient-card)`. Input fields: dark backgrounds with subtle borders

### 1B. `app/page.tsx`  
**What changes:**
- No structural changes, no logic changes
- Update inline `style={{ background: '...' }}` on any elements to use CSS classes instead (cleaner)
- Ensure the AI advisor preview card tags still read correctly on dark backgrounds

---

## Phase 2 — Dashboard (2 files)

### 2A. `app/styles/dashboard.module.css` (currently 847 lines)
**What changes:**
- **Container:** `background: var(--pm-bg)` (was `#F5F6F8`)
- **Header:** `background: var(--pm-nav)` — already navy, but update borders and shadows for dark context. Logo mark stays red
- **Welcome hero:** `background: var(--gradient-surface)` (was flat navy). Add subtle glow behind greeting text
- **Quick access cards:** `background: var(--gradient-card)` + `border: 1px solid var(--pm-border)` + `3px top accent gradient-accent`. Hover: translate + glow
- **AI advisor hero card:** Dark card with `gradient-card` background + glassmorphism border
- **Academic tools grid:** Card backgrounds → `var(--gradient-card)`, icon squares keep navy/red but adjust for dark-on-dark contrast. Category labels → `var(--pm-text-muted)`
- **Batch info cards:** `var(--gradient-card)` background, accent stripes via `var(--gradient-accent)` for all three (or keep navy/red/navy distinct via `border-image`). Badges → `var(--gradient-accent)` background
- **Footer:** Already dark, minor polish for consistency
- **All text colors:** body → `var(--pm-text-secondary)`, headings → `var(--pm-text)`, muted → `var(--pm-text-muted)`

### 2B. `app/dashboard/page.tsx`
**What changes:**
- Remove inline `color: '#0C234B'` and `color: '#AB0520'` from feature icon containers — use CSS classes instead
- Remove inline `style={{ background: '#0C234B' }}` / `style={{ background: '#AB0520' }}` on batch badges — these move to CSS or use a data-attribute approach
- No logic changes

---

## Phase 3 — AI Advisor Chat (2 files)

### 3A. `app/styles/advisor.module.css` (currently 498 lines — just rewritten)
**What changes:**
- **Container:** `background: var(--pm-bg)`
- **Header:** Already navy — keep, but ensure border uses `var(--pm-border-active)` (red accent bottom line)
- **Message bubbles:** AI messages → `var(--gradient-card)` with `var(--pm-border)`. User messages → `var(--gradient-accent)` background
- **Input area:** `background: rgba(12, 35, 75, 0.6)`. Text input background → `rgba(255,255,255,0.05)`, border `var(--pm-border)`, focus border `var(--pm-border-active)`. Placeholder text → `var(--pm-text-muted)`
- **Quick prompts:** Dark pill buttons — `var(--pm-border)` borders, hover → `var(--gradient-accent)`
- **Transcript banner:** Dark card style matching overall palette
- **Send button:** `var(--gradient-accent)` background
- **All text:** Update to dark-mode text tokens

### 3B. `app/components/AdvisorChat.tsx`
**What changes:**
- No logic changes
- Ensure any inline styles use dark-compatible colors
- Avatar styles already reference CSS classes — no change needed

---

## Phase 4 — Auth Page (2 files)

### 4A. `app/styles/auth.module.css` (currently 6,794 bytes)
**What changes:**
- **Page background:** `var(--pm-bg)`
- **Auth card:** `var(--gradient-card)` + `var(--pm-border)` + `border-radius: 16px` + `3px top gradient-accent accent`
- **Input fields:** Dark background (`rgba(255,255,255,0.04)`), `var(--pm-border)` border, focus → `var(--pm-border-active)`
- **Buttons:** Primary → `var(--gradient-accent)`, secondary → transparent + red border
- **Text:** Labels → `var(--pm-text-muted)`, values → `var(--pm-text-secondary)`
- **Google OAuth button:** Dark outline with white text

### 4B. `app/auth/page.tsx`
**What changes:**
- No logic changes. Only if there are inline styles with light-mode colors, convert them to CSS classes

---

## Phase 5 — My Courses / Placements (1 file)

### 5A. `app/styles/placements.module.css` (currently 19,001 bytes)
**What changes:**
- Full dark treatment: page bg → `var(--pm-bg)`, cards → `var(--gradient-card)`, borders → `var(--pm-border)`
- Upload area: dark dashed border, icon contrast on dark
- Course table rows: alternating row colors use subtle transparency differences
- Batch recommendation card: `var(--gradient-accent)` accent stripe, dark card body
- All button styles: primary → gradient-accent, secondary → outline with red border
- Text updates to dark tokens throughout

---

## Phase 6 — Grade Calculator / Progress (1 file)

### 6A. `app/styles/progress.module.css` (currently 22,789 bytes)
**What changes:**
- Page bg, cards, inputs → full dark treatment (same pattern as above)
- Grade component table: dark rows with subtle `var(--pm-border)` separators
- GPA calculator cards: `var(--gradient-card)` background
- Score needed indicators: keep functional green/yellow/red but adjust for dark readability (use lighter tints)
- Tab buttons: dark inactive, `var(--gradient-accent)` active underline
- Progress bars: track → `rgba(255,255,255,0.06)`, fill → `var(--gradient-accent)`

---

## Phase 7 — Remaining Interior Pages (7 CSS files, 0 TSX changes)

All of these follow the **exact same pattern**: dark bg, gradient-card surfaces, dark typography scale, red accent borders/buttons, no logic changes.

### 7A. `app/styles/clubs.module.css` (11,766 bytes)
- Club cards, event cards, filter chips → dark card treatment
- Category tags → `var(--pm-border)` outline, `var(--pm-text-muted)` text
- Search input → dark input style

### 7B. `app/styles/mentoring.module.css` (9,985 bytes)
- Mentor cards → `var(--gradient-card)`, rating stars → `var(--pm-red-light)`
- Booking modal → dark modal treatment
- Time slot buttons → dark pill style

### 7C. `app/styles/quiz.module.css` (13,054 bytes)
- Quiz container → dark bg, question card → `var(--gradient-card)`
- Answer option buttons → dark outline, selected → `var(--gradient-accent)` fill
- Progress bar → dark track with accent fill
- Timer → `var(--pm-text-muted)`

### 7D. `app/styles/results.module.css` (5,229 bytes)
- Section cards → `var(--gradient-card)`, selected → `var(--pm-border-active)`
- Recommended badge → `var(--gradient-accent)`
- Buttons → accent primary, outline secondary

### 7E. `app/styles/journal.module.css` (7,367 bytes)
- Sidebar list → dark surface, active entry → accent border
- Editor area → dark bg, text → `var(--pm-text)`
- Entry cards → `var(--gradient-card)`

### 7F. `app/styles/profile.module.css` (5,215 bytes)
- Profile card → `var(--gradient-card)`
- Form inputs → dark input treatment
- Avatar area → dark bg

### 7G. `app/styles/settings.module.css` (2,789 bytes)
- Cards → dark, data rows → subtle separators
- Danger zone → `rgba(171, 5, 32, 0.1)` background with red border
- Delete button → red outline

### 7H. `app/styles/support.module.css` (4,362 bytes — shared by help, feedback, privacy pages)
- Content card → `var(--gradient-card)`, header → dark nav
- Form inputs → dark
- Chat messages (help center) → dark bubbles

### 7I. `app/styles/auth-multi.module.css` (1,719 bytes)
- Multi-auth layout → dark treatment consistent with auth

### 7J. `app/styles/staff-dashboard.module.css` (25,702 bytes)
- Sidebar → `var(--pm-nav)`, active tab → red accent left border
- Main content area → `var(--pm-bg)`
- Calendar, appointment cards, profile form → all dark card treatment

---

## Summary Table

| # | File | Type | Size | Change Scope |
|---|------|------|------|-------------|
| 0A | `app/globals.css` | Global tokens | 6.2KB | Add dark tokens + gradients + type scale |
| 0B | `app/layout.tsx` | Layout | 887B | Update Google Fonts link (Inter only) |
| 1A | `app/styles/landing.module.css` | CSS Module | 23.9KB | Full dark restyle |
| 1B | `app/page.tsx` | Page | 15.9KB | Remove inline styles → CSS classes |
| 2A | `app/styles/dashboard.module.css` | CSS Module | 16.5KB | Full dark restyle |
| 2B | `app/dashboard/page.tsx` | Page | 12.6KB | Remove inline styles → CSS classes |
| 3A | `app/styles/advisor.module.css` | CSS Module | 14.2KB | Full dark restyle |
| 3B | `app/components/AdvisorChat.tsx` | Component | 17.4KB | Inline style cleanup only |
| 4A | `app/styles/auth.module.css` | CSS Module | 6.8KB | Full dark restyle |
| 4B | `app/auth/page.tsx` | Page | 22.5KB | Inline style cleanup only |
| 5A | `app/styles/placements.module.css` | CSS Module | 19.0KB | Full dark restyle |
| 6A | `app/styles/progress.module.css` | CSS Module | 22.8KB | Full dark restyle |
| 7A | `app/styles/clubs.module.css` | CSS Module | 11.8KB | Full dark restyle |
| 7B | `app/styles/mentoring.module.css` | CSS Module | 10.0KB | Full dark restyle |
| 7C | `app/styles/quiz.module.css` | CSS Module | 13.1KB | Full dark restyle |
| 7D | `app/styles/results.module.css` | CSS Module | 5.2KB | Full dark restyle |
| 7E | `app/styles/journal.module.css` | CSS Module | 7.4KB | Full dark restyle |
| 7F | `app/styles/profile.module.css` | CSS Module | 5.2KB | Full dark restyle |
| 7G | `app/styles/settings.module.css` | CSS Module | 2.8KB | Full dark restyle |
| 7H | `app/styles/support.module.css` | CSS Module | 4.4KB | Full dark restyle |
| 7I | `app/styles/auth-multi.module.css` | CSS Module | 1.7KB | Full dark restyle |
| 7J | `app/styles/staff-dashboard.module.css` | CSS Module | 25.7KB | Full dark restyle |

**Total: 22 files modified** — 16 CSS modules + 1 global CSS + 1 layout + 4 TSX (inline style cleanup only)

---

## What Will NOT Change

- ❌ No routing or navigation logic
- ❌ No data fetching, API calls, or state management
- ❌ No component structure or DOM hierarchy
- ❌ No Supabase/auth logic
- ❌ No new dependencies
- ❌ No new pages or components

---

## Execution Order

I will proceed in this exact order and verify each phase visually before moving on:

1. **Phase 0** — Foundation tokens + font (2 files)
2. **Phase 1** — Landing page (first impression)
3. **Phase 2** — Dashboard (core experience)
4. **Phase 3** — AI Advisor chat
5. **Phase 4** — Auth page
6. **Phase 5** — Placements / My Courses
7. **Phase 6** — Grade Calculator
8. **Phase 7** — All remaining interior pages

---

**Awaiting your approval before I begin.**
