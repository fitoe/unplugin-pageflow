# How PageFlow works

PageFlow combines framework-specific route discovery with a framework-neutral visual client.

## 1. Discover routes

The selected adapter reads the framework's route source. Vue Router and Nuxt expose router records; file-based frameworks contribute routes through their build integrations; React Router accepts route objects; Next.js uses a development sidecar.

## 2. Start the development runtime

The plugin injects a small runtime only while the development server is running. It reports route information, visible navigation targets, page titles, and readiness to the PageFlow endpoint.

## 3. Render real pages

PageFlow opens same-origin application pages in controlled iframes. The selected page remains live, while background pages are captured into bounded thumbnail caches.

## 4. Detect navigation

Adapters recognize supported framework links, same-origin anchors, history changes, literal programmatic destinations, and explicit navigation hints. The client turns these destinations into directed graph edges and preview hotspots.

## 5. Lay out the graph

LeaferJS renders the canvas. Route decks reduce large path hierarchies, a spatial index limits viewport work, and large layouts can run in a Worker.

## Production builds

PageFlow is development-only. Its runtime endpoints and visual client are not injected into production output. The repository's production-output check verifies this boundary.

## Safety boundary

Preview mode blocks anchor navigation and form submission inside its controlled frame, but it cannot suppress application initialization side effects. Use local or test data.

