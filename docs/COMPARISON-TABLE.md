# Comparison table (`comparisonTable` block)

A hand-built comparison table for any page. Its columns, rows and values are
all typed into the section itself.

It is **independent of the Product module**:

- It needs no products and stores no product ids.
- It never queries a product table.
- The only database read when it renders is one batched lookup for the column
  logos.

The **Product comparison table** (`productTable`), which compares catalogue
products, is unchanged and sits beside it in the picker.

## Adding one

Go to **Pages → (page) → Page builder → Add → Comparison table**. It is in the
**Content** group, and searching for "comparison" finds it.

A new table starts with a demo comparing Google Workspace, Microsoft 365 and
Zoho Workplace:

- **Rows:** grouped into Email, Storage, Collaboration, Meetings and
  Administration.
- **Values:** every value is a placeholder (`$X.XX`, `XX GB (demo)`).
- **Small print:** says the content is demo content.

Replace every value with verified information before publishing.

## Editing

The section's **Content** tab has four parts:

### Live preview

The live preview uses the same component the public page renders. It can be
hidden, and **Full screen** gives the editor the whole window (Esc or **Done**
returns).

### Columns

Each column has:

- name and subtitle
- an optional logo from the Media Library, with alt text
- price and price description
- button label and link (a page, URL or popup), and a show/hide switch
- a **highlight as recommended** switch with a badge
- its own background and text colour

Reorder columns by dragging or with the arrow buttons. You can also duplicate
a column (its values come too) or delete it (its values go too). A table holds
up to 8 columns.

### Rows and values

- **Feature rows** compare. **Group rows** are headings for the rows after
  them, up to the next group.
- Drag a row by its handle. From the keyboard, focus the handle, press Space,
  move with the arrow keys, then press Space again. Each row's details also
  have **Move up / Move down**.
- Each row can be duplicated, hidden or deleted. Its details hold the
  **tooltip**, shown as an (i) beside the feature name.
- Hiding a group hides the rows under it. A group with no visible rows is not
  published.
- A table holds up to 150 rows (features and groups together).

Every cell has its own type:

| Type | Shows |
| --- | --- |
| Text | the text, with an optional small note |
| Rich text | bold, italic and links only; anything else is removed |
| Checkmark / Cross | a green tick or a muted cross, with an optional note |
| Icon | one of the CMS icons, with an optional label |
| Number | formatted for the market's locale, with a unit; anything that is not a number is saved empty |
| Price | the amount and its period ("per user / month") |
| Empty / N/A | a dash, read out as "Not applicable" |

### Heading and design fields

These are the heading, eyebrow, description and small print, plus three
collapsible groups:

- **Layout:**
  - feature column title and width
  - minimum column width
  - value alignment
  - sticky feature column and sticky header
  - stacked cards or sideways scroll on phones
  - button placement
- **Colours:** table, header, group rows, borders, the highlighted column, and
  alternating rows.
- **Style:**
  - borders (rows, full grid, none) and corner radius
  - highlight style
  - cell padding, text size and header weight
  - button style and full-width buttons
  - shadow, row hover, and the entrance animation

The section's own **Design / Responsive / Advanced** tabs work as for every
section: background, spacing, width, typography and visibility.

**Save, Undo, Reset, Duplicate and Delete** are the section editor's own. Undo
steps back one cell or field at a time.

## Responsive behaviour

- **Desktop:** the full table. The feature column can stay in view while
  scrolling.
- **Tablet and mobile:** the table scrolls sideways inside itself, never the
  page.
  - The edges fade where there is more to see, and a "Swipe to compare" hint
    shows while columns are off-screen.
  - The scroll area can be focused and scrolled with the arrow keys.
- **Mobile, stacked cards** (optional): one card per column, listing every
  row.
- **Sticky header:** a long table scrolls inside itself (up to 80% of the
  screen height), so its header can stay at the top.
- **Reduced motion:** visitors who ask for it get no entrance animation and no
  transitions.

## Data

Everything is JSON in `PageSection.content`. No new tables and no migrations.
The schema is in `src/lib/cms/comparison-table.ts`.

- **Stable ids:** columns, rows and groups have ids (`col_…`, `row_…`,
  `grp_…`) that never change when renamed or reordered. Cells are keyed by
  column id.
- **Parsing is per field:** an invalid value falls back on its own, and a
  broken list item is dropped. A bad cell can never send the whole table back
  to defaults.
- **Sanitised on save and again on render:**
  - rich text is reduced to inline formatting
  - button links must be a path, an anchor, http(s), mailto or tel
  - colours and lengths are validated
- **Price periods:** a leading slash is dropped, so another market's URL
  rewriting never turns "/month" into "/ae/month".

## Files

| File | Purpose |
| --- | --- |
| `src/lib/cms/comparison-table.ts` | schema, demo content, shared helpers |
| `src/components/cms/blocks/comparison-table-block.tsx` | public renderer (resolves logos) |
| `src/components/cms/blocks/comparison-table-view.tsx` | the markup, shared with the editor preview |
| `src/components/cms/blocks/comparison-scroller.tsx` | scroll cues |
| `src/components/cms/comparison-table-editor.tsx` | the Content tab |
| `src/app/globals.css` (`.cms-ct`) | styles |
| `tests/unit/comparison-table.test.ts` | tests |
