# Limitations and safety

PageFlow renders real application pages during development. Treat previews like normal visits to the local application.

## What PageFlow does

- Discovers routes exposed by the selected framework adapter.
- Renders same-origin page previews.
- Detects supported links and navigation targets.
- Blocks anchor navigation and form submission inside preview mode.
- Keeps its runtime out of production builds.

## What PageFlow does not do

- It does not bypass authentication or authorization.
- It does not automatically click controls.
- It does not suppress application startup side effects.
- It cannot infer every computed destination before the relevant interaction occurs.
- It does not inspect Astro island framework internals.

## Use safe data

Use local or test data for pages that perform writes during initialization. Do not configure real passwords, tokens, verification codes, or other secrets as preview state.

Authentication and route-specific state come from the current browser session. A page without permission may render the normal sign-in or access-denied experience.
