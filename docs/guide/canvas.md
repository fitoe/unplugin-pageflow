# Using the canvas

The PageFlow canvas is designed for exploring a route graph rather than editing application data.

## Move and zoom

- Scroll or use a trackpad to zoom around the pointer.
- Drag empty canvas space to move the viewport.
- Select a page card to focus it and reveal its relationships.
- Use the browser viewport controls to compare mobile and desktop previews.

## Focus a page

Selecting a page brings its connected pages into view, promotes the selected preview to a live iframe, and shows navigation hotspots. The focused view is useful when the full graph contains more context than you need.

## Explore route groups

Routes with shared path segments can appear as a deck. Open the deck to inspect the next level. PageFlow keeps a breadcrumb for the active group and animates between levels so the current context remains clear.

## Read connections

Connections are directional. An outgoing line means the source page contains a known way to reach the target. A missing line does not always mean navigation is impossible: computed destinations are discovered only when the application exposes them.

## Refresh previews

PageFlow captures stale pages in a bounded queue. The selected page and visible pages receive priority. Route and link changes are delivered through HMR, while existing thumbnails remain visible until replacements are ready.

## Tips

- Start from the home or primary entry route.
- Enter one route group at a time in large applications.
- Use test data before focusing pages that perform initialization writes.
- If a page never becomes ready, add an [explicit readiness signal](/en/reference/configuration#preview-readiness).

