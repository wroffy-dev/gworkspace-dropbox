# SaaS Admin UI Design System

> Project: `digiemporiaa-dot/saas`  
> Scope: Admin backend only  
> Design direction: Clean premium SaaS UI + controlled Apple Liquid Glass  
> Priority: Readability, consistency, performance, responsive behavior, and reusable UI primitives.

---

## 1. Design Goal

The admin should feel like a premium modern SaaS product, not a generic dashboard template.

The visual direction combines:

- Clean, minimal SaaS dashboard structure
- Apple-inspired Liquid Glass surfaces
- Soft depth and subtle translucency
- Strong typography hierarchy
- Compact but readable data density
- Consistent reusable components
- Clear navigation and module grouping
- Responsive behavior for desktop, laptop, tablet, and mobile

The final interface must look refined and premium while remaining practical for daily admin work.

---

## 2. Core Design Principle

Use a **70 / 30 balance**:

- **70% clean SaaS admin UI**
- **30% Liquid Glass treatment**

Do not turn the whole application into transparent glass.

Glass is used primarily for:
- Topbar
- Sidebar shell
- Search
- Filters
- KPI cards
- Dropdowns
- Drawers
- Popovers
- Floating action areas
- Selected navigation surfaces

Dense working areas should remain mostly solid:
- Tables
- Large forms
- Page editors
- Product editors
- Lead tables
- SEO audit tables
- Form builders
- Long settings screens

Rule:

> Glass creates hierarchy and polish. Solid surfaces preserve readability.

---

## 3. Overall Layout

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Topbar                                                     │
│         ├────────────────────────────────────────────────────────────│
│         │ Breadcrumbs                                                │
│         │ Page title + description                   Primary Action   │
│         │                                                            │
│         │ KPI / Summary cards                                        │
│         │                                                            │
│         │ Main Content Surface                                       │
│         │ Search / Filters / Tabs / Actions                           │
│         │                                                            │
│         │ Table / Form / Builder / Analytics                          │
│         │                                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Desktop behavior

- Sidebar: expanded by default
- Sidebar can collapse to icon-only mode
- Topbar remains sticky
- Main page width should be fluid
- Dense pages may use wider layouts
- Forms should use sensible max-widths
- Preserve scroll position and expanded state after save

### Mobile behavior

- Sidebar becomes an off-canvas drawer
- Header actions collapse intelligently
- Filters become horizontally scrollable or wrap cleanly
- Tables may use horizontal scrolling when necessary
- Important columns remain visible first
- No overlapping tabs, buttons, filters, or form controls

---

## 4. Current Admin Information Architecture

The UI must respect the existing repo features and routes.

### Dashboard

```text
Dashboard
└── /admin
```

---

### Website

```text
Website
├── Pages
│   └── /admin/pages
├── Page Categories
│   └── /admin/pages/categories
├── Navigation
│   └── /admin/navigation
├── Media
│   └── /admin/media
└── Website Design
    └── /admin/settings/design
```

Do not place Popups or Recycle Bin inside Website in the final information architecture.

---

### Products

```text
Products
├── All Products
│   └── /admin/products
├── Categories
│   └── /admin/products/categories
├── Brands
│   └── /admin/products/brands
├── Featured & Ordering
│   └── /admin/products/order
├── Product Design
│   └── /admin/products/design
└── Removed Products
    └── /admin/products/trash
```

---

### Content

```text
Content
└── Blog
    ├── All Posts
    │   └── /admin/blog
    ├── Categories
    │   └── /admin/blog/categories
    ├── Tags
    │   └── /admin/blog/tags
    ├── Layout
    │   └── /admin/blog/layout
    └── Design
        └── /admin/blog/design
```

Blog and SEO must not be merged into one navigation group.

---

### Leads & CRM

```text
Leads & CRM
├── CRM Dashboard
│   └── /admin/crm
├── Leads
│   └── /admin/leads
├── Pipeline
│   └── /admin/pipeline
├── Customers
│   └── /admin/customers
└── Forms
    ├── All Forms
    │   └── /admin/forms
    ├── Submissions
    │   └── /admin/forms/submissions
    └── Consent Notice
        └── /admin/consent
```

Consent belongs logically with Forms.

---

### Marketing

```text
Marketing
├── Popups
│   └── /admin/popups
├── Tracking & Pixels
│   └── /admin/marketing
├── UTM Campaigns
│   └── /admin/marketing/campaigns
├── Lead Magnets
│   └── /admin/lead-magnets
└── Campaign Attribution
    └── /admin/reports?view=attribution
```

Popups should be visually grouped under Marketing.

---

### SEO

```text
SEO
├── SEO Settings
│   └── /admin/seo
├── SEO Intelligence
│   └── /admin/seo-intelligence
└── Slug & URL Manager
    └── /admin/slug-manager
```

The Slug & URL Manager includes concepts such as:

- All URLs
- URL Patterns
- Redirects
- Conflicts
- History
- URL Health
- CSV import/export
- Bulk URL operations

It should feel like a first-class SEO tool.

---

### Reports

```text
Reports
└── Reports
    └── /admin/reports
```

Audit Log should not visually live under Reports.

---

### Locations

```text
Locations
├── Countries
│   └── /admin/settings/countries
├── Cities
│   └── /admin/cities
└── City Page Generator
    └── /admin/cities/generator
```

Data hierarchy:

```text
Country / Market
   ↓
City
   ↓
Pages
```

City pages remain ordinary Pages.

Examples:

```text
India
└── Delhi
    ├── /delhi
    └── /delhi/dropbox-plus

UAE
└── Dubai
    ├── /ae/dubai
    └── /ae/dubai/dropbox-plus
```

Region is optional and must not be presented as a mandatory hierarchy level.

---

### Administration

```text
Administration
├── Staff
│   └── /admin/staff
├── Roles & Permissions
│   └── /admin/staff?tab=roles
└── Audit Log
    └── /admin/audit
```

---

### System

```text
System
├── Recycle Bin
│   └── /admin/trash
├── Backup & Restore
│   └── /admin/settings/backups
└── Seed Files
    └── /seed-files
```

Seed Files remains Super Admin only.

---

### Settings

```text
Settings
├── Website Settings
│   └── /admin/settings
└── Email Settings
    └── /admin/settings/email
```

Settings must not become a dumping ground.

Feature-specific settings stay with their feature.

---

## 5. Sidebar Design

### Expanded Sidebar

The expanded sidebar is the primary mode.

Properties:

- Soft translucent surface
- Subtle backdrop blur
- Thin border
- Rounded internal navigation items
- Strong active state
- Clear module labels
- Nested sub-navigation
- Smooth collapse animations
- Scrollable independently from content

Recommended structure:

```text
Dashboard

WEBSITE
▸ Website
▸ Products
▸ Content

CUSTOMERS
▸ Leads & CRM

GROWTH
▸ Marketing
▸ SEO
▸ Reports

LOCATIONS
▸ Countries
▸ Cities
▸ City Page Generator

ADMIN
▸ Administration
▸ System
▸ Settings
```

### Collapsed Sidebar

Collapsed state becomes icon-only.

Requirements:

- Tooltip on hover/focus
- Active item remains obvious
- Flyout submenu for grouped modules
- No content overlap
- Must preserve collapsed state across reloads

### Sidebar visual treatment

Suggested:

```text
width expanded: 248–264px
width collapsed: 68–76px
background: translucent white / neutral glass
border: subtle 1px
radius: 18–24px where layout permits
```

Do not use extreme transparency.

---

## 6. Topbar

The topbar is the strongest Liquid Glass surface.

Suggested layout:

```text
Breadcrumbs        Global Search        Country        View Site   Bell   Profile
```

### Components

- Breadcrumbs
- Global admin search
- Country / market switcher
- Optional quick actions
- View Website action
- Notifications
- User profile menu

### Profile Menu

Profile should not be a main sidebar module.

Use:

```text
Profile Menu
├── My Profile
├── Security
├── Activity
└── Logout
```

Route:

```text
/admin/profile
```

---

## 7. Liquid Glass Rules

Liquid Glass should be subtle and controlled.

### Use on

- Topbar
- Sidebar
- KPI cards
- Search bars
- Filter controls
- Dropdown menus
- Popovers
- Modal shells
- Drawers
- Sticky save bars
- Floating actions

### Avoid excessive glass on

- Dense tables
- Rich text editors
- Complex forms
- Form Builder canvas
- Page Builder
- SEO issue tables
- Product tables
- Lead tables
- Audit tables

### Glass recipe

Recommended visual behavior:

```text
background: rgba(255, 255, 255, 0.58–0.76)
backdrop blur: 14–22px
border: subtle light border
shadow: soft, low-opacity
inner highlight: very subtle
```

Dark mode, if added later, should use the same principle with dark translucent surfaces.

---

## 8. Color System

Use semantic variables instead of hardcoded colors.

Suggested light theme:

```text
App Background      #F5F6F8
Surface             #FFFFFF
Surface Soft        #FAFAFB
Text Primary        #111827
Text Secondary      #6B7280
Text Muted          #9CA3AF
Border              #E5E7EB
Border Soft         rgba(17,24,39,0.06)
Primary CTA         #111111
Primary CTA Text    #FFFFFF
```

Brand color should be used sparingly.

Good brand-accent areas:

- Active navigation indicator
- Selected tabs
- Charts
- Progress indicators
- Focus rings
- Links
- Small accent icons
- Score indicators

Avoid painting entire pages in the brand color.

---

## 9. Typography

Use a clean modern sans-serif system.

Recommended hierarchy:

```text
Page Title      24–30px / semibold
Section Title   16–20px / semibold
Card Metric     26–32px / semibold
Body            14px
Table Body      13–14px
Helper Text     12–13px
Labels          12–13px / medium
```

Rules:

- Keep line-height comfortable
- Do not use ultra-light text
- Secondary text must remain readable
- Avoid oversized headings in admin screens

---

## 10. Radius System

Recommended:

```text
Outer admin shell     24px
Primary cards         18px
Secondary cards       14–16px
Inputs                12–14px
Buttons               12–14px
Dropdowns             14px
Pills / badges        999px
```

Use consistent radii everywhere.

---

## 11. Shadows and Depth

Use restrained shadows.

Avoid:
- large dark shadows
- floating-everything look
- excessive glow

Recommended hierarchy:

```text
Level 0: no shadow
Level 1: thin border + very soft shadow
Level 2: glass card / menu shadow
Level 3: modal / drawer shadow
```

Depth should come from:
- background separation
- blur
- border
- soft shadow
- spacing

not from heavy shadows.

---

## 12. KPI Cards

KPI cards should follow the reference UI style.

Example:

```text
┌─────────────────────────┐
│ Total Leads        ╱╲   │
│ 1,284                   │
│ +12.4%                   │
└─────────────────────────┘
```

Recommended contents:

- icon
- label
- primary value
- trend
- optional mini sparkline

Avoid unnecessary decoration.

---

## 13. Tables

Tables are central to the admin and must prioritize usability.

### Table container

- Mild glass or soft white outer card
- Solid inner table area
- Clear sticky header when useful
- Subtle row separators
- Compact but readable spacing

### Table toolbar

```text
Search | Filters | Saved View | Bulk Actions | Export
```

### Row behavior

- Soft hover state
- No aggressive animations
- Row actions in `...` menu
- Status shown as small pill
- Primary identifier aligned clearly
- Images/avatars kept small and consistent

### Mobile

For large tables:

- horizontal scrolling
- sticky first important column where practical
- optional compact card view for critical mobile screens

Never squeeze columns until text overlaps.

---

## 14. Status Badges

Use small, soft semantic badges.

Examples:

```text
Active
Draft
Published
Inactive
Failed
Warning
Suspended
New
```

Style:

- light tint background
- readable text
- no highly saturated backgrounds
- consistent radius and height

Do not rely on color alone.
Include text labels.

---

## 15. Forms

Forms should be modular, not endless walls of fields.

Preferred structure:

```text
Page Title

[ General ] [ Design ] [ SEO ] [ Advanced ]

General Information
┌──────────────────────────────────────┐
│ Name                                 │
│ Slug                                 │
│ Status                               │
└──────────────────────────────────────┘

Contact
┌──────────────────────────────────────┐
│ Phone                                │
│ Email                                │
└──────────────────────────────────────┘
```

### Form rules

- Labels clearly above controls
- Optional helper text below
- Consistent input heights
- Clear validation
- Required marker visible but subtle
- Do not overload one row with too many fields
- Long forms broken into sections
- Save actions remain accessible

### Save behavior

Existing requirement:

- Save should not unnecessarily reload the page
- Edited section remains visible
- Expanded/collapsed state remains preserved
- Saved content reflects immediately
- Cursor must not jump during edits

---

## 16. Tabs

Tabs must never overlap.

Rules:

- Horizontal scroll on narrow screens
- Proper gap between tabs
- Clear selected state
- Avoid excessive pill shapes for large tab groups
- Use underline or soft surface selection
- Tab text must not wrap awkwardly

For large modules, allow secondary navigation patterns when needed.

---

## 17. Search and Filters

Search/filter controls should use a subtle glass treatment.

Example:

```text
[ Search pages... ] [ Country ▼ ] [ City ▼ ] [ Status ▼ ] [ Score ▼ ]
```

Rules:

- same height
- same radius
- consistent spacing
- filters wrap cleanly
- active filters clearly visible
- reset filters available when necessary

---

## 18. Dashboard Design

Suggested dashboard cards:

```text
Total Leads
Published Pages
Active Products
SEO Score
```

Additional sections may include:

- Lead trend
- Country performance
- SEO issues
- Recent activity
- Recent submissions
- Top products
- Top pages

Keep the dashboard useful, not decorative.

---

## 19. SEO Intelligence Design

Suggested summary:

```text
SEO Intelligence

Overall SEO     AEO Score     GEO Score     Critical Issues
87              81            76            14
```

Toolbar:

```text
Search | Country | City | Content Type | Score Range | Issue Type
```

Table:

```text
Page                  SEO     AEO     GEO     Issues     Status
Dropbox Business      92      84      79      2          Good
Dropbox Plus          88      80      76      4          Review
Delhi Landing Page    86      88      82      3          Good
```

Score cards may use glass.
Audit data table should remain solid and readable.

---

## 20. Cities Design

Header:

```text
Cities
Manage local address spaces inside each market.
```

KPI examples:

```text
Total Cities
Active Cities
Published Cities
City Pages
```

Toolbar:

```text
Search City | Country | Status | Add City | City Page Generator
```

Table:

```text
City
Country
Region
Pages
Landing Page
Status
SEO
Actions
```

Region remains optional.

---

## 21. Countries Design

Countries represent storefronts / markets.

Suggested table:

```text
Country
Code
URL Prefix
Currency
Pages
Products
Posts
Status
Actions
```

Country detail/settings may use tabs:

```text
General
Contact
SEO
Robots
Sync
```

Country sync must remain clearly separated from destructive actions.

---

## 22. Products Design

Summary cards:

```text
Total Products
Published
Draft
Removed
```

Toolbar:

```text
Search | Country | Brand | Category | Status
```

Table:

```text
Product
Brand
Category
Markets
Status
Updated
Actions
```

Product editor:

```text
General
Pricing
Content
Design
SEO
Advanced
```

---

## 23. Leads & CRM Design

Summary:

```text
Total Leads
New
Qualified
Won
```

Toolbar:

```text
Search | Date | Source | Country | Status | Assigned To
```

Table:

```text
Name
Email
Company
Source
Country
Status
Assigned
Date
Actions
```

Pipeline may use Kanban but must remain readable and performant.

---

## 24. Media Design

Media must feel like a proper asset manager.

Layout:

```text
Folders Sidebar
+
Media Grid / List
+
Upload Action
```

Requirements:

- Folder navigation
- Search
- Type filter
- Grid/list switch if useful
- Consistent thumbnail ratios
- Upload progress
- File size/type validation
- Clear selection state

---

## 25. Popups / Marketing Design

Popups belong to Marketing.

Use:

- status cards
- campaign list
- scheduling
- targeting
- design preview
- conversion stats when available

The editor should not become overly glassy.
Use a solid work surface.

---

## 26. Slug & URL Manager Design

This should feel like an advanced professional SEO utility.

Recommended internal tabs:

```text
All URLs
URL Patterns
Redirects
Conflicts
History
URL Health
```

Use a sticky tab bar when useful.

Primary actions:

- Search
- Filter
- Bulk update
- Import
- Export
- Reset
- Edit
- Preview

Risky actions must use clear confirmation states.

---

## 27. Page Builder / Complex Editors

The builder is a working tool, not a showcase screen.

Use:

- solid canvas
- subtle glass toolbar
- solid side panels
- clear drag handles
- clear save state
- undo/reset controls
- no excessive transparency
- strong contrast

The builder must feel stable and precise.

---

## 28. Modal and Drawer Design

Preferred:
- side drawer for editing secondary data
- modal for confirmations
- full page for complex creation/edit flows

Drawer shell:
- mild glass
- solid content body
- sticky header
- sticky footer actions where necessary

---

## 29. Buttons

Primary:

```text
dark / near-black
white text
medium weight
```

Secondary:
- white or subtle glass
- thin border

Danger:
- semantic red
- used only for destructive actions

Buttons must never compete visually with each other.

---

## 30. Icons

Use one consistent icon family already used by the project.

Rules:

- consistent stroke
- consistent size
- icons supplement labels
- do not replace important labels with ambiguous icons
- collapsed sidebar must provide tooltips

---

## 31. Motion

Motion should feel premium but restrained.

Use:

- 150–250ms transitions
- soft opacity
- slight translate
- subtle scale only where appropriate
- smooth drawer/sidebar transitions

Avoid:
- bouncing
- exaggerated spring motion
- excessive hover animation
- continuous decorative animation in admin screens

---

## 32. Responsive Breakpoints

Design for:

```text
Mobile
Tablet
Small laptop
Laptop
Desktop
Large desktop
```

Important targets:

- ~360px mobile
- 768px tablet
- 1024px small laptop
- 1280px laptop
- 1440px desktop
- 1920px large desktop

Do not optimize only for 1440px screenshots.

---

## 33. Accessibility

Required:

- keyboard navigation
- visible focus states
- accessible contrast
- labels for icon buttons
- `aria-expanded` for collapsible controls
- proper dialog semantics
- status not communicated by color alone
- accessible tables and form labels

Glass must never reduce text contrast below usable levels.

---

## 34. Performance Rules

Do not use heavy effects everywhere.

Rules:

- limit large backdrop blur regions
- avoid nested blur layers
- avoid excessive box-shadow
- avoid unnecessary animated gradients
- reuse component styles
- keep DOM complexity under control
- avoid layout shift
- maintain smooth scrolling

The premium look must not make the admin feel slow.

---

## 35. Design Tokens

Create/reuse centralized CSS variables.

Example naming:

```css
--admin-bg
--admin-surface
--admin-surface-soft
--admin-glass
--admin-glass-border
--admin-text
--admin-text-muted
--admin-border
--admin-shadow-sm
--admin-shadow-md
--admin-radius-sm
--admin-radius-md
--admin-radius-lg
--admin-sidebar-bg
--admin-header-bg
--brand
```

Do not scatter raw values across components.

---

## 36. Component Reuse

Create or standardize reusable primitives for:

```text
AdminPageHeader
AdminCard
StatCard
AdminTable
AdminToolbar
SearchInput
FilterSelect
StatusBadge
AdminTabs
SectionCard
GlassSurface
Drawer
Modal
EmptyState
LoadingSkeleton
Pagination
Breadcrumbs
SaveBar
```

Pages should compose these primitives instead of recreating styling independently.

---

## 37. Consistency Rules

Every admin page should follow the same visual logic.

### List page pattern

```text
Breadcrumb
Title + Description + Action
Optional KPI cards
Search + Filters
Table/List
Pagination
```

### Editor page pattern

```text
Breadcrumb
Title + Status + Save
Tabs
Section Cards
Sticky/accessible actions
```

### Dashboard pattern

```text
Header
KPI cards
Charts
Recent/important tables
```

---

## 38. Things to Avoid

Do not:

- use glass on every element
- use low-contrast text
- create deeply nested cards
- mix unrelated settings
- add random shadows
- use inconsistent corner radii
- create different table styles per module
- overload sidebars
- hide important actions behind icons only
- use massive gradient backgrounds
- use excessive animation
- break existing responsive behavior
- create new route structures only for visual reasons

---

## 39. Design Quality Target

The final admin should feel:

```text
Premium
Calm
Fast
Structured
Modern
Professional
High-value
Consistent
Easy to scan
Easy to operate daily
```

It should not feel:

```text
Template-like
Overdesigned
Gaming UI
Crypto dashboard
Heavy glassmorphism
Marketing landing page
Crowded enterprise software
```

---

## 40. Final Design Direction

The final visual formula is:

```text
Clean SaaS Architecture
+
Reference Dashboard Layout
+
Controlled Apple Liquid Glass
+
Strong Information Architecture
+
Readable Tables & Forms
+
Consistent Components
+
Subtle Motion
=
Premium SaaS Admin Backend
```

### Non-negotiable rule

> Visual redesign must never damage existing routes, permissions, country scoping, city behavior, SEO logic, forms, CRM behavior, URL registry, backups, staff access, or any existing business functionality.

Design must wrap and improve the existing product, not rewrite its business logic.
