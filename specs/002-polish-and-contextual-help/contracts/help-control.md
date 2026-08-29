# Contract: the help control

`src/components/help-link.tsx` — one shared component, used everywhere an interface subject
warrants explanation.

## Shape

```
<HelpLink topic="Asset groups" article="assets/asset-groups" />
```

- `topic` — what the control explains, in the user's words. Used for the accessible name.
  Required, because "button" is not an accessible name and a bare "?" is not either.
- `article` — `category/slug`. Resolves to `/help/<category>/<slug>`.
- Optional `className` for placement only. Not for restyling — a control that looks different
  on different pages stops reading as the same affordance.

## Rendering rules

1. **It is a server component and it awaits.** Existence is a database fact (FR-015), and
   resolving it requires a query.

2. **One query per request, not per control.** The slug set is fetched through a
   `cache()`-wrapped function in `src/lib/help-articles.ts`. React's `cache` dedupes within a
   request, so a page with eight controls issues one query. Confirmed against the installed
   Next.js docs (`01-app/01-getting-started/06-fetching-data.md`), not from recollection.

3. **Absent article renders nothing.** Not a disabled control, not a link to the index —
   nothing. FR-015. A control pointing at a deleted article is worse than no control, because
   it spends the user's trust before failing.

4. **It never carries meaning by colour.** It is an icon plus an accessible name; it is not
   the only route to the information, since the help section remains browsable.

5. **It does not print.** FR-017. The work order print view must be unaffected.

6. **Activation region ≥ 44×44px**, achieved with padding and compensating negative margin so
   the visible glyph stays small (research D8). The control sits beside a title and must not
   compete with it.

7. **It does not disturb the title.** Placement must survive a long user-supplied name — a
   department or asset name of arbitrary length — without wrapping oddly or being pushed off
   screen.

## Non-goals

- **Not a tooltip.** Hover text is unavailable on the primary platform, which is a phone.
- **Not a popover.** It navigates. Help articles are long, linked, and searchable, and
  reproducing them in an overlay would fork the content.
- **Not on every heading.** The map in `data-model.md` is deliberately partial. Controls on
  self-evident labels would rebuild the noise this feature removes.

## Test obligations

| Obligation | How |
|---|---|
| Renders and links correctly | Follow every control in a running app (SC-004) |
| Vanishes when the article is gone | Delete a row locally, reload, confirm absence |
| One query for N controls | Query log on a page with several controls |
| Absent from print | Print emulation capture |
| Hit box ≥ 44px | Measured in the sweep, not eyeballed |
| Every referenced slug exists | Static check against the seed set — catches typos, whose symptom is a control silently not rendering |
