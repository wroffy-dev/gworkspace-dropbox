# Custom code section (`customHtml` block)

Your own HTML, CSS and JavaScript as a page section. Use it for third-party
embeds (booking widgets, maps, forms, calculators), a one-off design, or
anything the other blocks do not cover.

## Who can use it

Custom code runs for every visitor, so it needs a permission of its own:
**Pages → Add and edit custom code sections** (`pages.customCode`).

- **Super Admin** has it. **No other role gets it by default**, Admin
  included. Grant it under **Administration → Roles & permissions**.
- It is needed to **add** a custom code section, **change its code**, or
  **duplicate** it. This applies on pages and on product pages.
- Anyone who can edit the page can still move, hide, restyle or delete one.
  None of those changes what code runs.
- Every code change is recorded in the **audit log**
  (`section.code.updated`), with the full before and after.

## Adding one

Go to **Pages → (page) → Page builder → Add → Custom code** (Content group).

The Content tab has:

- **HTML, CSS and JavaScript** panes. They use a monospace font, and Tab
  indents (Esc then Tab leaves the box). Each pane shows its size against its
  limit: HTML 100k characters, CSS and JS 50k each. HTML may include `<script>`
  and `<style>` tags, so a vendor's whole embed code can be pasted as it is.
- **Runs:** Isolated or Inline (see below).
- **Isolated options:** height (grow with content, or fixed), accessible name,
  and lazy loading.
- **Preview:** desktop and mobile widths. It re-runs automatically after a
  pause in typing, or on **Run**. The preview **always runs isolated**, so
  code being written never runs inside the admin.

## Isolated (default, recommended)

The code runs in its own document inside a sandboxed `<iframe>`.

- The sandbox has `allow-scripts` but **no** `allow-same-origin`, so the code
  runs in an opaque origin of its own. It **cannot** read the site's cookies,
  storage or page, call the site's server actions, or reach a signed-in admin's
  session.
- **It can still:**
  - draw anything
  - load third-party scripts and embeds
  - submit forms and open popups (payment and booking windows work)
  - show `alert()`
  - navigate the page when a visitor clicks a link (`<base target="_top">`)
- **Height:** the frame grows to its content's height automatically. The
  frame reports its height to the section, the section only believes messages
  from its own frame, and the height is capped at 20,000px.
- **Not in the page's HTML:** the content is not part of the page's own
  HTML, so search engines treat it like any embed.

## Inline

The code runs in the page itself. Use this only for trusted code that must
change the page.

- **Markup:** the HTML is rendered on the server, so it is in the page's HTML.
- **CSS:** goes in a `<style>` element and applies to the whole page. Scope it
  with the section's id, shown in the editor: `#custom-code-<section id>`.
- **Scripts:** `<script>` tags in the HTML are lifted out and run after the
  section mounts, in order (an external script loads before the next runs),
  followed by the JavaScript pane. They run exactly once, and again after
  client-side navigation.
- **Risk:** inline code has full access to the page, including for
  administrators who browse the site while signed in. The editor shows a
  warning when Inline is chosen.

## Notes

- Code is never rewritten for a market. Other blocks' content has root paths
  (`/pricing`) rewritten into the market's URL space. Custom code is exempt,
  so a stylesheet starting `/* … */` is left alone.
- No new tables and no migrations. The code is JSON in `PageSection.content`,
  like every other block.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/cms/custom-html.ts` | schema, sandbox policy, frame document, script extraction |
| `src/lib/cms/block-permissions.ts` | which blocks need an extra permission |
| `src/components/cms/blocks/custom-html-block.tsx` | public renderer |
| `src/components/cms/blocks/custom-html-frame.tsx` | sandboxed frame with auto height |
| `src/components/cms/blocks/custom-html-inline.tsx` | inline script runner |
| `src/components/cms/custom-html-editor.tsx` | the Content tab |
| `tests/unit/custom-html.test.ts` | tests |
