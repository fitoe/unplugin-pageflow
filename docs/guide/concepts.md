# Core concepts

PageFlow turns an application's routes and navigation targets into an explorable graph. Understanding five concepts makes the rest of the interface straightforward.

## Pages

A page represents one concrete route that PageFlow can render. Static routes are ready immediately. Dynamic routes become renderable after you provide representative parameter values.

Each page can have a title, route path, preview, thumbnail, navigation links, and associated tests. Query strings and hashes can preserve a more specific navigation location without creating unrelated route definitions.

## Navigation links

A link is a directed relationship from one page to another. PageFlow can discover supported router links, same-origin anchors, literal programmatic destinations, browser-history navigation, and explicit framework hints such as `data-pageflow-to`.

Computed destinations may only become known after the application performs the relevant interaction.

## Hotspots

When a page is selected, PageFlow highlights the elements that produce known navigation. Hotspots connect the visual preview to the graph: they show not only that two routes are related, but where the transition starts in the real UI.

## Previews and thumbnails

The selected page uses a live same-origin iframe. Other nearby pages use captured previews so the canvas stays responsive. Cached thumbnails remain visible while stale pages are refreshed in the background.

## Route groups

Large route trees are collapsed into decks. Enter a deck to inspect its children, then use the breadcrumb to return to an ancestor. Grouping reduces visual noise without discarding page relationships.

## Next

- [Learn the canvas controls](/guide/canvas)
- [Configure dynamic routes](/guide/dynamic-routes)
- [See how PageFlow works](/guide/how-it-works)

