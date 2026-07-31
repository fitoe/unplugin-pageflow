# Large projects and caching

PageFlow avoids rendering every route as a live document at the same time. Its rendering and caching strategy is bounded so large graphs remain explorable.

## Viewport rendering

Only nearby DOM previews and LeaferJS scene objects are mounted. Distant pages use compact representations. One selected page is promoted to a live iframe.

## Thumbnail tiers

Nearby pages can use detailed previews. Distant pages use compact WebP thumbnails, and long pages can be split into viewport-mounted tiles. Stale thumbnails stay visible while replacements are captured.

## Capture queue

Fonts, images, and a quiet DOM are awaited before capture. Work runs one page at a time, with the selected and visible pages receiving priority.

## Layout and lookup

Graphs above 1,000 pages can move layout work to a Worker. A spatial index finds visible pages without scanning the entire graph during every viewport update.

## Cache location

Persistent thumbnails are stored under:

```text
.unplugin-pageflow/cache
```

Memory and disk caches use fixed LRU budgets. The directory is disposable development output and can be removed when you need a completely fresh capture.

## Practical guidance

- Group routes with meaningful path segments.
- Provide stable dynamic parameter samples.
- Keep preview pages deterministic with fixture data.
- Use the readiness signal for long-running asynchronous pages.
