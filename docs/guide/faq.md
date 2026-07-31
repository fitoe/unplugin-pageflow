# Frequently asked questions

## Does PageFlow run in production?

No. PageFlow is a development tool. Its runtime and endpoints are excluded from production builds.

## Does it replace a router or test runner?

No. It reads routes from supported integrations and invokes only the test commands you explicitly configure.

## Can it bypass authentication?

No. Previews use the current browser session and normal application authorization.

## Will PageFlow click every control automatically?

No. It detects supported navigation targets but does not crawl the product by automatically clicking controls.

## Why is a computed destination missing?

A destination assembled at runtime may not exist until the relevant interaction occurs. Prefer a supported link or provide an explicit hint where the framework adapter allows one.

## Can previews change data?

Application startup code still runs. Preview mode blocks anchor navigation and form submission in the controlled frame, but it cannot prevent initialization side effects. Use local or test data.

## Where are thumbnails stored?

Persistent thumbnails are stored in `.unplugin-pageflow/cache`. The directory can be deleted safely while the development server is stopped.

## Which frameworks are supported?

See the current [compatibility matrix](/reference/compatibility).

## How do I report a bug?

Open an issue on [GitHub](https://github.com/fitoe/unplugin-pageflow/issues) with the framework, versions, minimal configuration, route pattern, and relevant console output.

