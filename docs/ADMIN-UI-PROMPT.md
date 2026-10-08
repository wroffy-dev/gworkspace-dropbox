# Prompt: Apple-style Liquid Glass Admin Panel

> Copy everything below the line into your AI coding assistant (Claude Code, Cursor, etc.) inside the other project.
> It is stack-agnostic, with concrete values. Where it says "Tailwind", translate to your CSS approach if you use something else.

---

## Role and goal

You are redesigning the **admin panel only** of this project into a premium, Apple-inspired SaaS admin with controlled "Liquid Glass" surfaces, a light and dark theme, and a collapsible floating sidebar.

Before writing code, read the existing admin layout, navigation, shared UI components (Card, Button, Dialog, Menu, Table, Field, Badge, EmptyState, Alert) and global CSS. Reuse and restyle them. Do not create a parallel component set.

### Non-negotiable rules

1. **Admin only.** The public website must not change at all: no colour, font, spacing or layout differences. Scope every admin style under one root class, `.admin-ui`, set on the admin shell's root element. Also add it to `<body>` from an effect while the admin is mounted, so portalled dialogs, menus and toasts inherit it. Verify afterwards that a public page renders exactly as before.
2. **70 / 30 balance.** About 70% clean, solid SaaS UI and 30% glass. Glass is for chrome (sidebar, topbar, search, menus, KPI cards, filter bars, overview panels). Dense work areas stay solid and readable: tables, long forms, editors and builders.
3. **No behaviour regressions.** Keep every route, permission check, form submit, and keyboard and screen-reader behaviour. This is a visual and IA pass, not a rewrite.
4. **Ship in phases**, each one reviewable and green on lint, typecheck and tests:
   1. tokens and shell
   2. primitives
   3. module screens
   4. dark mode
   5. polish

---

## 1. Design tokens

Use channel-style CSS variables (`R G B`, no `rgb()`), so alpha lives where the colour is used: `rgb(var(--token) / 0.5)`.

Declare these on `.admin-ui`. Also re-point the app's existing generic tokens there (text, muted, border, surface), so every existing admin screen picks the system up without markup changes.

```css
.admin-ui {
  /* Text, surfaces, borders */
  --text: 17 24 39;            /* #111827 */
  --text-muted: 99 104 115;
  --border: 229 231 235;
  --surface: 255 255 255;
  --surface-soft: 250 250 251;
  --workspace-bg: 245 246 248; /* page background behind everything */

  /* Primary action is near-black, NOT the brand colour. The brand colour is
     only the accent: active nav, selected tab, focus ring, links. */
  --primary: 17 17 17;
  --primary-fg: 255 255 255;
  --accent: 0 97 255;          /* brand */

  /* Navigation colours, derived from one foreground */
  --nav-fg: 17 24 39;
  --nav-hover: rgb(17 24 39 / 0.05);
  --nav-active: rgb(17 24 39 / 0.07);
  --nav-guide: rgb(17 24 39 / 0.1);   /* vertical line beside nested items */

  /* Glass: two channels retune the whole glass family per theme */
  --glass-tint: 255 255 255;
  --shadow-ink: 15 23 42;

  /* Radius */
  --radius-shell: 24px;   /* sidebar, topbar */
  --radius-card: 18px;
  --radius-card-sm: 14px;
  --radius-control: 12px; /* inputs, buttons, selects */
  --radius-menu: 14px;

  /* Depth: border + soft shadow, never a heavy drop shadow */
  --shadow-sm: 0 1px 2px rgb(17 24 39 / 0.04), 0 1px 3px rgb(17 24 39 / 0.03);
  --shadow-md: 0 2px 6px rgb(17 24 39 / 0.04), 0 10px 28px rgb(17 24 39 / 0.06);
  --shadow-lg: 0 6px 16px rgb(17 24 39 / 0.06), 0 28px 64px rgb(17 24 39 / 0.12);

  /* Type: system sans, calm weights, whatever font the public site uses */
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-family: var(--font);
}
```

### Typography

| Element | Size | Weight / style |
|---|---|---|
| Page title | 28–30px | 700, tight tracking |
| Description | 14–15px | muted |
| Card titles | 16px | 600 |
| Body | 14px | regular |
| Table header | 11–12px | uppercase, tracking-wide, muted |
| KPI values | 26–30px | 600, tabular numbers |

---

## 2. Liquid Glass recipes

Write these as unlayered CSS after the utilities, scoped `.admin-ui .x`, so they win over utility classes.

```css
/* Topbar: strongest glass */
.admin-ui .glass-bar {
  background: rgb(var(--glass-tint) / 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgb(var(--glass-tint) / 0.7);
  box-shadow: 0 1px 2px rgb(var(--shadow-ink) / 0.04),
              0 8px 24px rgb(var(--shadow-ink) / 0.06),
              inset 0 1px 0 rgb(var(--glass-tint) / 0.8);
}
/* Sidebar rail */
.admin-ui .glass-rail {
  background: rgb(var(--glass-tint) / 0.68);
  backdrop-filter: blur(22px) saturate(170%);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  border: 1px solid rgb(var(--glass-tint) / 0.7);
  box-shadow: 0 1px 2px rgb(var(--shadow-ink) / 0.04),
              0 12px 32px rgb(var(--shadow-ink) / 0.06),
              inset 0 1px 0 rgb(var(--glass-tint) / 0.8);
}
/* KPI cards, filter bars */
.admin-ui .glass-card {
  background: rgb(var(--glass-tint) / 0.7);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  border: 1px solid rgb(var(--glass-tint) / 0.75);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgb(var(--glass-tint) / 0.85);
}
/* Menus, popovers: most opaque, they sit over anything */
.admin-ui .glass-menu {
  background: rgb(var(--glass-tint) / 0.86);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgb(var(--border) / 0.9);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-menu);
}

/* Fallbacks */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .admin-ui .glass-bar, .admin-ui .glass-rail,
  .admin-ui .glass-card, .admin-ui .glass-menu { background: rgb(var(--glass-tint) / 0.97); }
}
@media (prefers-reduced-transparency: reduce) {
  .admin-ui .glass-bar, .admin-ui .glass-rail,
  .admin-ui .glass-card, .admin-ui .glass-menu {
    background: rgb(var(--glass-tint) / 0.97);
    backdrop-filter: none; -webkit-backdrop-filter: none;
  }
}
```

**Glass needs colour behind it.** Over a flat grey page it just looks white. For the Dashboard (and other overview screens if you want), add a fixed, decorative ambient layer behind the content:

```css
.admin-ui .dashboard { position: relative; isolation: isolate; }
.admin-ui .ambient {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(44rem 34rem at 12% 8%,  rgb(var(--accent) / 0.24), transparent 62%),
    radial-gradient(38rem 30rem at 88% 14%, rgb(139 92 246 / 0.20),  transparent 62%),
    radial-gradient(46rem 34rem at 62% 96%, rgb(20 184 166 / 0.17),  transparent 62%),
    radial-gradient(30rem 24rem at 30% 62%, rgb(236 72 153 / 0.10),  transparent 62%);
}
@media (prefers-reduced-transparency: reduce) { .admin-ui .ambient { display: none; } }
```

On that screen, give the cards a `glass` variant: `Card glass`. Leave the Card solid by default.

```css
.admin-ui .glass-panel {
  background: linear-gradient(180deg, rgb(var(--glass-tint) / 0.66), rgb(var(--glass-tint) / 0.44));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-color: rgb(var(--glass-tint) / 0.75);
  box-shadow: 0 1px 2px rgb(var(--shadow-ink) / 0.04),
              0 14px 36px rgb(var(--shadow-ink) / 0.06),
              inset 0 1px 0 rgb(var(--glass-tint) / 0.9);
}
.admin-ui .glass-panel .border-hairline { border-color: rgb(var(--border) / 0.55); }
/* tiles / quick-action buttons inside a glass panel */
.admin-ui .glass-chip { background-color: rgb(var(--glass-tint) / 0.42);
                        box-shadow: inset 0 1px 0 rgb(var(--glass-tint) / 0.7); }
.admin-ui .glass-chip:hover { background-color: rgb(var(--glass-tint) / 0.85); }
```

The topbar's sticky wrapper usually has a fade strip in the page colour. Over the ambient wash that strip shows up as a grey band. On the dashboard, replace it with a masked blur:

```css
.admin-ui:has(.dashboard) .topbar-fade { background: none; }
.admin-ui:has(.dashboard) .topbar-fade::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  mask-image: linear-gradient(to bottom, #000 55%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent);
}
```

---

## 3. Layout shell

```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │  Topbar (floating glass bar)                 │
│ (floating│──────────────────────────────────────────────│
│  glass   │  Page title + description        [Actions]   │
│  rail)   │  KPI cards (optional)                        │
│          │  Tabs / Search + Filters                     │
│          │  Table / content (solid)                     │
└──────────┴──────────────────────────────────────────────┘
```

- **Workspace background:** `rgb(var(--workspace-bg))`.
- **Main content:** `max-width: 100rem`, centred inside the area right of the sidebar, padding 16px on mobile and 24px from `sm` up.
- **Content left padding:** the sidebar floats 12px from the edges, so the content clears it: 280px expanded (`lg:pl-[17.5rem]`) and 100px collapsed (`lg:pl-[6.25rem]`). Animate it with `transition: padding 200ms ease-out`.

---

## 4. Sidebar

### Look

- Floating glass rail: `.glass-rail`, fixed at `top/bottom/left: 12px` on desktop, radius 20–24px, width 256px.
- Section headings in small uppercase, muted and tracking-wide. Group items by area, for example:

  | Section | Items |
  |---|---|
  | (none) | Dashboard |
  | Website | Pages, Navigation, Media, Design |
  | Catalogue | Products |
  | Content | Blog |
  | Customers | Leads & CRM |
  | Growth | Marketing, SEO, Reports |
  | Locations | Countries, Cities |
  | Admin | Administration, System, Settings |

- Items with children expand into a nested list with a thin vertical guide line (`--nav-guide`). Expanded and collapsed groups persist in `localStorage`.
- **Active item:** soft surface `--nav-active`, foreground text, and a **3px accent bar** on the left edge. The active parent auto-expands.
- **Hover:** `--nav-hover`.

### Header row

1. Logo (or brand initial in a rounded square), then the site name.
2. **The collapse toggle sits in the header row, right of the logo.** Use a "panel left close / open" icon in a 32px rounded button. Label it with `aria-label` "Collapse navigation" / "Expand navigation".
3. **No sidebar footer.** Do not put "View website" or "Collapse" buttons at the bottom. "View website" lives in the topbar as an icon button.

### Collapsed mode (desktop)

- Width 76px (`4.75rem`). Show icons only, centred. Hide section headings and replace them with a thin divider.
- Show the logo mark only.
- Hovering or focusing an item shows a **tooltip / fly-out** with its label. A parent item shows a fly-out listing its children as links.
  - Render the fly-out `position: fixed`, so the rail's `overflow: hidden` does not clip it.
  - Use `z-index` above the content.
- Persist collapsed state in `localStorage` (`admin:nav:collapsed`). Read it after mount to avoid hydration mismatch.

### Mobile (< 1024px)

- The sidebar becomes an off-canvas drawer, opened from a menu button in the topbar.
- It has a dim and blur backdrop. Esc and a backdrop click close it, and it closes on navigation.
- The collapse toggle is hidden on mobile.

---

## 5. Topbar

A floating glass bar (`.glass-bar`, radius 20–24px), sticky at the top inside a wrapper. The wrapper has padding and a fade gradient from the workspace colour, so content scrolling under it fades out.

From left to right:

1. **Mobile:** sidebar menu button.
2. **Breadcrumbs**, derived automatically from the nav config: `Admin › Section › Page`. Don't hand-write them per page.
3. **Search / command palette** ("Search or jump to…", with a `⌘K` hint chip). It opens a command dialog that jumps to pages and records.
4. Optional context picker (for example `Country: India ▾`).
5. **Create ▾**: primary near-black button with a menu of quick-create actions.
6. **Theme toggle** (see §6): a 36px icon button.
7. **View website**: an icon button (external-link icon) that opens the public site in a new tab. This replaces any "View website" button in the sidebar.
8. **Profile menu**: avatar with initials, name and role. The menu holds My profile, Security, Theme options (on mobile), View website, Staff & roles, and Sign out (in red).

On phones, keep the search usable. Hide the theme toggle there and put "Light / Dark / System theme" items in the profile menu instead.

---

## 6. Dark mode (Light / Dark / System)

### Mechanism

- **Preference:** `'light' | 'dark' | 'system'`, stored in `localStorage` under `admin:theme`. Default to `system`.
- **Applied state:** `data-admin-theme="dark|light"` on `<html>`. All dark CSS is `:root[data-admin-theme="dark"] .admin-ui …`. Because it is scoped under `.admin-ui`, the public site never changes.
- **No flash.** Inline this script in the admin layout, before the shell renders:

  ```js
  (function(){try{var p=localStorage.getItem('admin:theme')||'system';
  var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-admin-theme',d?'dark':'light');}catch(e){}})();
  ```

- **System:** while the preference is "System", listen to `matchMedia('(prefers-color-scheme: dark)')` changes and re-apply live.
- **Toggle UI:** a menu with Light (sun), Dark (moon) and System (monitor), with a check on the current option. The trigger shows the current icon. Render a neutral icon until mounted to avoid a hydration mismatch.

### Dark tokens

```css
:root[data-admin-theme="dark"] .admin-ui {
  color-scheme: dark;
  --text: 236 237 240;  --text-muted: 156 163 175;
  --border: 46 51 61;   --surface: 26 29 35;  --surface-soft: 32 36 43;
  --workspace-bg: 14 16 20;
  --primary: 245 245 247; --primary-fg: 17 17 17;   /* primary inverts to near-white */
  --nav-fg: 236 237 240;
  --nav-hover: rgb(255 255 255 / 0.06); --nav-active: rgb(255 255 255 / 0.08);
  --nav-guide: rgb(255 255 255 / 0.1);
  --glass-tint: 30 33 40;  --shadow-ink: 0 0 0;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.4), 0 1px 3px rgb(0 0 0 / 0.3);
  --shadow-md: 0 2px 6px rgb(0 0 0 / 0.35), 0 10px 28px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 6px 16px rgb(0 0 0 / 0.4), 0 28px 64px rgb(0 0 0 / 0.55);
}
/* Dark glass: light hairline + faint top highlight */
:root[data-admin-theme="dark"] .admin-ui :is(.glass-bar,.glass-rail,.glass-card,.glass-panel) {
  border-color: rgb(255 255 255 / 0.08);
}
```

### Things that break in dark mode, handle them all

- **Hard-coded `bg-white` surfaces** must map to `--surface`. Exclude switch knobs (`ui-switch-knob`) and iframes or previews of the public site (`ui-keep-white`).
- **Tinted status utilities** (`bg-{red,amber,emerald,sky,violet,…}-50/100`, including alpha variants like `bg-amber-50/60`) become `rgb(c500 / 0.14)`.
  - Map `text-{c}-600` to `c400`, and `text-{c}-700…950` to `c300`.
  - Map `border-{c}-200/300` to `c500 / 0.35`.
  - Generate these rules for every colour you use. Match alpha variants with attribute selectors (`[class*=" bg-amber-50/"]`).
- **Logo:** if a separate dark logo exists, render both images and swap them with CSS (`.logo-dark` hidden in light mode, `.logo-light` hidden in dark mode).
- **Charts:** use token colours, not fixed hex values.

---

## 7. Primitives (restyle, don't duplicate)

- **Buttons:**
  - Primary is near-black (`--primary`); in dark mode it inverts to near-white.
  - Secondary is a white or surface button with a hairline border.
  - Ghost and danger variants.
  - Height 36–40px, radius `--radius-control`, an icon left of the label, 8px gap.
- **Inputs / selects:** same height and radius as buttons, hairline border, accent focus ring (`ring-2` accent at 0.6 alpha), placeholder in muted.
- **Card:** solid surface, hairline border, `--radius-card`, `--shadow-sm`. Supports a `glass` prop for overview screens. The CardHeader has a title, optional description, actions on the right, and a bottom hairline.
- **KPI / StatCard:**
  - Contents: a small uppercase label, an icon tile at top right (32px rounded square, tinted by tone), the value, an optional hint line, an optional trend chip and an optional sparkline (72px).
  - Trend chips always include an arrow and a sign, so they don't rely on colour alone. An `invertTrend` prop handles "bad when up" metrics, such as lost leads.
  - Tones: default, brand, success, danger, warning. Colour only values that mean something.
  - Uses the `.glass-card` style, and is clickable with a hover lift of 1px plus `--shadow-md`.
  - **Grid:** 2 columns on phones, 4 from `xl`. For 6 or more cards, use 4 columns and only go wider on very wide screens, so labels never collide with icons.
- **Badges / status pills:** small, soft tint background with readable text, always with a text label.
- **Tabs:** underline or soft-surface selection. They scroll horizontally on narrow screens, never overlap, and their text never wraps.
- **Search + filters bar:** a `.glass-card` strip holding the search input and filter selects, all the same height and radius, wrapping cleanly. Presets ("All / Published / Drafts") sit as soft pills above the bar.
- **Tables:**
  - Solid surface inside a card, uppercase muted header, subtle row separators and a soft hover.
  - Row actions as icon buttons or a `⋯` menu.
  - Primary identifier in bold with a secondary line in muted.
  - On mobile, scroll horizontally. Never squeeze columns until text overlaps.
- **Empty state:** a 48px round muted icon tile, a 16px semibold title, a one-line description, and the primary action button.
- **Alert:** soft tinted box with a **tone icon** (info, success, warning, danger) beside the text.
- **Dialog:** solid surface, radius 20px, `--shadow-lg`, dim and blur scrim. It traps focus, closes on Esc, restores focus on close, and becomes a bottom sheet on mobile. Keep the close handler in a ref so typing in the dialog's inputs doesn't re-run its focus effect.
- **Menus / dropdowns:** `.glass-menu`, 14px radius, 36px items, icons left, separators.

---

## 8. Page patterns: every screen follows one of these

### List page

```
Title + one-line description                 [Secondary] [Primary "New …"]
KPI cards (optional, counted across the whole scope, not the filter)
Preset pills
Search + filters bar
Table card (+ pagination / count)
```

- **Width:** list screens use the **full** content width. Form and settings screens use a readable max-width (`max-w-3xl` / `max-w-4xl`) and are **left-aligned**, not centred. The title must sit in the same spot on every screen.
- **Primary action:** "New X" always goes in the page header, top right. Never put it inside the list card. Its empty state repeats it.

### Editor page

```
← Back
Title + status badge                         [Preview] [Save]
Tabs: General · Content · Design · SEO · Advanced
Section cards (fieldsets with a heading + helper text)
```

- Save does not reload the page or lose scroll, cursor or expanded state.

### Dashboard

```
Welcome back, <first name> + one-line context      [scope picker]
4 KPI cards (with sparkline/trend)
Needs attention (count tiles; amber tint when > 0)  |  Quick actions (2-col tile grid)
Trend chart (30 days)                               |  Pipeline / status bars
Recent records list                                 |  Setup checklist · Recent activity
```

- Ambient wash with glass panels (§2).

### Long content safety (prevents layouts breaking)

- `fieldset { min-inline-size: 0 }`. Fieldsets default to min-content width, which blows up grids.
- Grid tracks use `minmax(0, 1fr)`, not `1fr`.
- Long filenames, URLs and slugs use `break-words` / `break-all`, and truncate with a `title` tooltip.

---

## 9. Motion, accessibility, performance

- **Motion:** 150–250ms ease-out, for hover, menus and the sidebar width. No bouncing, no parallax. Respect `prefers-reduced-motion`.
- **Contrast:** at least 4.5:1 for text on glass in both themes. If glass hurts legibility, increase opacity rather than lowering contrast.
- **Focus:** a visible accent ring on every interactive element. Include a skip link to the main content.
- **Icon-only buttons** have an `aria-label` and a `title`.
- **Backdrop-filter is costly.** Use it only on chrome, cards and overview panels, never on every table row. Provide the `@supports` and reduced-transparency fallbacks.
- **Write class names in full.** Tailwind purges names built dynamically (`` `shadow-${x}` ``), so use a literal map.

---

## 10. Acceptance checklist

- [ ] The public site is pixel-identical before and after (check the home page, a content page and a form).
- [ ] The sidebar has no footer. The collapse toggle sits beside the logo. Collapsed width is 76px, with tooltips and fly-outs. State persists. Mobile uses a drawer.
- [ ] The topbar contains, in order: breadcrumbs, ⌘K search, Create ▾, theme toggle, View website icon, profile menu. Theme items appear in the profile menu on mobile.
- [ ] Light, Dark and System all work. The choice persists. There is no flash on reload. System follows the OS live.
- [ ] Every list screen uses the same header position, the action in the header, the same KPI style, and the same filter bar and table look.
- [ ] Dark mode has no white boxes, no unreadable tinted chips, and no invisible borders.
- [ ] The dashboard shows a visible glass effect over the ambient wash in both themes. Content scrolling under the topbar blurs away.
- [ ] No horizontal scroll at 390px on any screen. Long text never breaks layouts.
- [ ] Lint, typecheck and tests pass. Take screenshots of the key screens at 1440px and 390px, in light and dark.
