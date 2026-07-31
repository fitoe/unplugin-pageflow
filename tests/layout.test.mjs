import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('lays out linked pages in layers and limits previews to the viewport', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { assignOrderedFocusSides, centerPageTransform, collapseRepeatedListLinks, createPageSpatialIndex, createRouteDeckView, getRenderablePages, getVisiblePageIds, layoutPageGrid, layoutPagesByRoute, queryPageSpatialIndex, routeDeckPathForPage } = await server.ssrLoadModule('/src/client/layout.ts')
    const { forwardWheelToCanvas, PAGEFLOW_CANVAS_CONFIG } = await server.ssrLoadModule('/src/client/canvas.ts')
    const { resolvePreviewUrl, touchPreviewCache } = await server.ssrLoadModule('/src/client/preview.ts')
    const { fullThumbnailTiles, thumbnailRevision, thumbnailSlot, thumbnailTierForZoom, thumbnailUrl, visibleThumbnailTiles } = await server.ssrLoadModule('/src/client/thumbnails.ts')
    const { boundedPreviewDocumentHeight, isInfiniteListDocument, maskedIconBackground, materializeMaskedIcons, previewDocumentHeight } = await server.ssrLoadModule('/src/client/snapshot.ts')
    const { FocusedPageStateCache, preserveScannedFocusedLinks } = await server.ssrLoadModule('/src/client/focus-cache.ts')
    const pages = Array.from({ length: 30 }, (_, index) => ({
      id: `page-${index}`,
      title: `Page ${index}`,
      path: `/page-${index}`,
      accent: '#ff795d',
      links: index < 2 ? [{ label: 'Next', to: `page-${index + 1}` }] : [],
    }))
    assert.equal(collapseRepeatedListLinks([0.2, 0.4, 0.6, 0.8].map((centerY, index) => ({
      label: `Row ${index}`,
      to: '/detail',
      hotspot: { centerX: 0.5, centerY },
    }))).length, 1)
    assert.equal(collapseRepeatedListLinks([0.2, 0.8].map((centerY, index) => ({
      label: `Independent ${index}`,
      to: '/detail',
      hotspot: { centerX: index, centerY },
    }))).length, 2)
    const focusCache = new FocusedPageStateCache()
    focusCache.set(pages[0], [{ label: 'Next', to: 'page-1', hotspot: { centerX: 0.2, centerY: 0.3 } }], { 'page-1': [12, 34] })
    const cachedFocus = focusCache.get(pages[0])
    assert.deepEqual(cachedFocus?.positions, { 'page-1': [12, 34] })
    cachedFocus.positions['page-1'][0] = 99
    assert.deepEqual(focusCache.get(pages[0])?.positions, { 'page-1': [12, 34] })
    assert.equal(focusCache.get({ ...pages[0], revision: 'changed' }), undefined)
    focusCache.retain(new Set(['page-1']))
    assert.equal(focusCache.get(pages[0]), undefined)
    const scannedLinks = [{ label: 'Runtime link', to: 'page-2' }]
    assert.equal(preserveScannedFocusedLinks('page-0', 'page-0', scannedLinks, []), scannedLinks)
    assert.deepEqual(preserveScannedFocusedLinks('page-0', undefined, scannedLinks, []), [])
    assert.equal(PAGEFLOW_CANVAS_CONFIG.type, 'viewport')
    assert.deepEqual(PAGEFLOW_CANVAS_CONFIG.zoom, { min: 0.05, max: 32 })
    assert.equal(PAGEFLOW_CANVAS_CONFIG.wheel.zoomMode, true)
    assert.equal(PAGEFLOW_CANVAS_CONFIG.wheel.zoomSpeed, 0.025)
    assert.equal(PAGEFLOW_CANVAS_CONFIG.move.dragEmpty, true)
    assert.deepEqual(
      centerPageTransform([100, 200], 500, { width: 1000, height: 800 }, 2),
      { x: 60, y: -500, scaleX: 2, scaleY: 2 },
    )
    assert.deepEqual(touchPreviewCache([], 'home'), ['home'])
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'home'), ['about', 'contact', 'home'])
    assert.equal(previewDocumentHeight({
      body: { scrollHeight: 1400, offsetHeight: 1200, clientHeight: 800, getBoundingClientRect: () => ({ height: 1300 }) },
      documentElement: { scrollHeight: 1350, offsetHeight: 1100, clientHeight: 844, getBoundingClientRect: () => ({ height: 1250 }) },
    }, 844), 1400)
    assert.equal(previewDocumentHeight({
      body: { scrollHeight: 500, offsetHeight: 500, clientHeight: 500, getBoundingClientRect: () => ({ height: 500 }) },
      documentElement: { scrollHeight: 500, offsetHeight: 500, clientHeight: 500, getBoundingClientRect: () => ({ height: 500 }) },
    }, 844), 844)
    assert.equal(boundedPreviewDocumentHeight({
      body: { scrollHeight: 10_000, getBoundingClientRect: () => ({ height: 10_000 }) },
      documentElement: { scrollHeight: 10_000, getBoundingClientRect: () => ({ height: 10_000 }) },
    }, 844), 3376)
    const infiniteListDocument = {
      body: { scrollHeight: 10_000, innerText: '加载更多', getBoundingClientRect: () => ({ height: 10_000 }) },
      documentElement: { scrollHeight: 10_000, getBoundingClientRect: () => ({ height: 10_000 }) },
      querySelector: () => ({ className: 'load-more' }),
    }
    assert.equal(isInfiniteListDocument(infiniteListDocument), true)
    assert.equal(boundedPreviewDocumentHeight(infiniteListDocument, 844), 844)
    const repeatedListDocument = {
      body: { scrollHeight: 10_000, innerText: '', getBoundingClientRect: () => ({ height: 10_000 }) },
      documentElement: { scrollHeight: 10_000, getBoundingClientRect: () => ({ height: 10_000 }) },
      querySelector: () => null,
      querySelectorAll: () => [{ children: Array.from({ length: 20 }) }],
    }
    assert.equal(isInfiniteListDocument(repeatedListDocument), true)
    assert.equal(boundedPreviewDocumentHeight(repeatedListDocument, 844), 844)
    const iconBackground = maskedIconBackground(
      `url("data:image/svg+xml;utf8,%3Csvg%3E%3Cpath fill='currentColor'/%3E%3C/svg%3E")`,
      'rgb(79, 167, 87)',
    )
    assert.match(iconBackground, /data:image\/svg\+xml/)
    assert.match(decodeURIComponent(iconBackground), /fill='rgb\(79, 167, 87\)'/)
    assert.match(thumbnailRevision(pages[0]), /^13:/)
    const hotspotLayer = { removed: false, remove() { this.removed = true } }
    const singleLineText = {
      textContent: '热门服务',
      style: {},
      getBoundingClientRect: () => ({ height: 23 }),
    }
    materializeMaskedIcons({
      defaultView: { getComputedStyle: () => ({ whiteSpace: 'pre-line', lineHeight: 'normal', fontSize: '16px' }) },
      querySelector: () => hotspotLayer,
      querySelectorAll: selector => selector === 'uni-text > span' ? [singleLineText] : [],
    })
    assert.equal(hotspotLayer.removed, true)
    assert.equal(singleLineText.style.whiteSpace, 'nowrap')
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'settings'), ['about', 'contact', 'settings'])
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'settings', 3), ['about', 'contact', 'settings'])
    const wheelCalls = []
    forwardWheelToCanvas({
      getLocal: ({ clientX, clientY }) => ({ x: clientX - 10, y: clientY - 20 }),
      wheel: data => wheelCalls.push(data),
    }, { deltaX: 0, deltaY: -120, ctrlKey: true }, 110, 220)
    assert.equal(wheelCalls.length, 1)
    assert.deepEqual(
      { x: wheelCalls[0].x, y: wheelCalls[0].y, deltaX: wheelCalls[0].deltaX, deltaY: wheelCalls[0].deltaY, ctrlKey: wheelCalls[0].ctrlKey },
      { x: 100, y: 200, deltaX: 0, deltaY: -120, ctrlKey: true },
    )
    assert.equal(thumbnailTierForZoom(49), 'compact')
    assert.equal(thumbnailTierForZoom(50), 'full')
    assert.notEqual(
      thumbnailUrl({ previewPath: '/preview/' }, { slot: 'home', revision: 'one', updatedAt: 1 }),
      thumbnailUrl({ previewPath: '/preview/' }, { slot: 'home', revision: 'one', updatedAt: 2 }),
    )
    const positions = layoutPageGrid(pages)

    const groupedRoutePositions = layoutPagesByRoute([
      { id: 'machinery-root', path: '/machinery/index', links: [] },
      { id: 'machinery-home', path: '/machinery/home/index', links: [] },
      { id: 'machinery-detail', path: '/machinery/orders/index', links: [] },
      { id: 'machinery-farmer-detail', path: '/machinery/farmer/orders/detail', links: [] },
      { id: 'inspection-home', path: '/inspection/home/index', links: [] },
    ], new Map([
      ['machinery-home', 300],
      ['machinery-detail', 500],
      ['machinery-farmer-detail', 700],
      ['inspection-home', 400],
    ]))
    assert(groupedRoutePositions.get('machinery-root')[1] < groupedRoutePositions.get('machinery-home')[1])
    assert.notEqual(groupedRoutePositions.get('machinery-home')[1], groupedRoutePositions.get('inspection-home')[1])
    assert.equal(groupedRoutePositions.get('machinery-home')[1], groupedRoutePositions.get('machinery-detail')[1])
    assert.notEqual(groupedRoutePositions.get('machinery-home')[0], groupedRoutePositions.get('machinery-detail')[0])
    assert(groupedRoutePositions.get('machinery-home')[1] < groupedRoutePositions.get('machinery-farmer-detail')[1])
    const machineryChildrenX = ['machinery-home', 'machinery-detail', 'machinery-farmer-detail']
      .map(id => groupedRoutePositions.get(id)[0])
    assert(groupedRoutePositions.get('machinery-root')[0] >= Math.min(...machineryChildrenX))
    assert(groupedRoutePositions.get('machinery-root')[0] <= Math.max(...machineryChildrenX))

    const siblingRoutePositions = layoutPagesByRoute([
      { id: 'agri-index', path: '/agri-service/index', links: [] },
      { id: 'agri-advice', path: '/agri-service/advice', links: [] },
      { id: 'agri-detail', path: '/agri-service/history/detail', links: [] },
    ])
    assert.equal(siblingRoutePositions.get('agri-index')[1], siblingRoutePositions.get('agri-advice')[1])
    assert.notEqual(siblingRoutePositions.get('agri-index')[0], siblingRoutePositions.get('agri-advice')[0])
    assert(siblingRoutePositions.get('agri-detail')[1] > siblingRoutePositions.get('agri-index')[1])

    const deepRoutePositions = layoutPagesByRoute([
      { id: 'depth-1', path: '/pages/module/index', links: [] },
      { id: 'depth-2', path: '/pages/module/second/index', links: [] },
      { id: 'depth-3', path: '/pages/module/second/third/index', links: [] },
      { id: 'depth-4', path: '/pages/module/second/third/fourth/index', links: [] },
    ])
    assert(deepRoutePositions.get('depth-1')[1] < deepRoutePositions.get('depth-2')[1])
    assert(deepRoutePositions.get('depth-2')[1] < deepRoutePositions.get('depth-3')[1])
    assert(deepRoutePositions.get('depth-3')[1] < deepRoutePositions.get('depth-4')[1])

    const pagesPrefixedPositions = layoutPagesByRoute([
      { id: 'pages-agri', path: '/pages/agri-service/advice', links: [] },
      { id: 'pages-finance', path: '/pages/finance/home/index', links: [] },
    ])
    assert.notEqual(pagesPrefixedPositions.get('pages-agri')[1], pagesPrefixedPositions.get('pages-finance')[1])

    const configuredRoutePositions = layoutPagesByRoute([
      { id: 'alphabetical-first', path: '/pages/alpha/index', routeOrder: 1, links: [] },
      { id: 'configured-first', path: '/pages/zeta/index', routeOrder: 0, links: [] },
    ])

    const rootDecks = createRouteDeckView([
      { id: 'home', path: '/pages/index', links: [] },
      { id: 'advice', path: '/pages/agri-service/advice', links: [] },
      { id: 'case', path: '/pages/agri-service/cases/detail', links: [] },
      { id: 'login', path: '/pages/login', links: [] },
    ])
    assert.deepEqual(rootDecks.directPages.map(page => page.id), ['home', 'login'])
    assert.deepEqual(rootDecks.decks.map(deck => [deck.label, deck.pages.length]), [['agri-service', 2]])
    assert.deepEqual(routeDeckPathForPage(rootDecks.decks[0].pages.concat(rootDecks.directPages), 'case'), ['agri-service'])
    const serviceDeck = createRouteDeckView(rootDecks.decks[0].pages, ['agri-service'])
    assert.deepEqual(serviceDeck.directPages.map(page => page.id), ['case', 'advice'])
    assert.equal(serviceDeck.decks.length, 0)
    const singletonDeck = createRouteDeckView([
      { id: 'only-child', path: '/pages/single/group/detail', links: [] },
    ])
    assert.deepEqual(singletonDeck.directPages.map(page => page.id), ['only-child'])
    assert.equal(singletonDeck.decks.length, 0)
    assert.deepEqual(routeDeckPathForPage([{ id: 'only-child', path: '/pages/single/group/detail', links: [] }], 'only-child'), [])
    const nestedDeckPages = [
      { id: 'module-index', path: '/pages/module/index', links: [] },
      { id: 'orders-index', path: '/pages/module/orders/index', links: [] },
      { id: 'orders-detail', path: '/pages/module/orders/detail/index', links: [] },
      { id: 'orders-edit', path: '/pages/module/orders/detail/edit', links: [] },
    ]
    assert.deepEqual(routeDeckPathForPage(nestedDeckPages, 'orders-edit'), ['module', 'orders', 'detail'])
    const sortedDeck = createRouteDeckView([
      { id: 'unknown', path: '/pages/service/advice', routeOrder: 0, links: [] },
      { id: 'detail', path: '/pages/service/detail', routeOrder: 5, links: [] },
      { id: 'create', path: '/pages/service/create', routeOrder: 4, links: [] },
      { id: 'search', path: '/pages/service/search', routeOrder: 3, links: [] },
      { id: 'list-later', path: '/pages/service/list', routeOrder: 2, links: [] },
      { id: 'home', path: '/pages/service/index', routeOrder: 1, links: [] },
      { id: 'history', path: '/pages/service/history', routeOrder: 6, links: [] },
      { id: 'mine', path: '/pages/service/mine', routeOrder: 7, links: [] },
      { id: 'list-earlier', path: '/pages/service/listing', routeOrder: 0, links: [] },
    ], ['service'])
    assert.deepEqual(sortedDeck.directPages.map(page => page.id), [
      'home', 'list-earlier', 'list-later', 'search', 'create', 'detail', 'history', 'mine', 'unknown',
    ])
    const deckGrid = layoutPageGrid([...rootDecks.directPages, ...rootDecks.decks.map(deck => deck.representative)], new Map(), 2)
    assert(deckGrid.get('login')[0] > deckGrid.get('home')[0])
    assert(deckGrid.get(rootDecks.decks[0].representative.id)[1] > deckGrid.get('home')[1])
    const focusSides = assignOrderedFocusSides([
      { id: 'left-low', centerX: 0.1, centerY: 0.8 },
      { id: 'right', centerX: 0.9, centerY: 0.5 },
      { id: 'left-high', centerX: 0.15, centerY: 0.2 },
    ])
    assert.deepEqual(focusSides.left.map(item => item.id), ['left-high', 'left-low'])
    assert.deepEqual(focusSides.right.map(item => item.id), ['right'])
    const overflowSides = assignOrderedFocusSides(Array.from({ length: 6 }, (_, index) => ({ id: `item-${index}`, centerX: 0.5, centerY: index / 5 })))
    assert(overflowSides.left.length + overflowSides.right.length >= 4)
    assert(overflowSides.top.length + overflowSides.bottom.length <= 2)
    assert(configuredRoutePositions.get('configured-first')[1] < configuredRoutePositions.get('alphabetical-first')[1])

    const visible = getVisiblePageIds(
      pages,
      positions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      0,
    )
    assert(visible.has('page-0'))
    assert(visible.has('page-1'))
    assert(visible.has('page-2'))
    assert(visible.size < pages.length)
    const manyPages = Array.from({ length: 10_000 }, (_, index) => ({
      id: `large-${index}`,
      title: `Large ${index}`,
      path: `/large-${index}`,
      accent: '#ff795d',
      links: [],
    }))
    const manyPositions = layoutPageGrid(manyPages)
    const manyIndex = createPageSpatialIndex(manyPages, manyPositions)
    assert(queryPageSpatialIndex(manyIndex, { left: 0, top: 0, right: 1000, bottom: 700 }).size < 20)
    const limited = getVisiblePageIds(
      manyPages,
      manyPositions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 0.01, scaleY: 0.01 },
      240,
      new Map(),
      96,
      manyIndex,
    )
    assert.equal(limited.size, 96)
    const renderable = getRenderablePages(manyPages, new Set(manyPages.map(page => page.id)), ['large-9998', 'large-9999'], 96)
    assert.equal(renderable.length, 98)
    assert(renderable.some(page => page.id === 'large-9999'))

    const tileManifest = Object.fromEntries(Array.from({ length: 3 }, (_, index) => {
      const slot = thumbnailSlot('home', 'pc', 'full', index)
      return [slot, {
        slot,
        revision: 'one',
        width: 240,
        height: 512,
        pageHeight: 1536,
        tileCount: 3,
        tileIndex: index,
        tileTop: index * 512,
        mimeType: 'image/webp',
        file: `${index}.webp`,
        updatedAt: 1,
      }]
    }))
    const tiles = fullThumbnailTiles(tileManifest, 'home', 'pc')
    assert.equal(tiles.length, 3)
    assert.deepEqual(
      visibleThumbnailTiles(tiles, 64, { width: 1000, height: 700 }, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, 0).map(tile => tile.tileIndex),
      [0, 1],
    )
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost'), '/app/products/demo-product?__unplugin-pageflow_preview=1')
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost', 'hash'), '/app/?__unplugin-pageflow_preview=1#/products/demo-product')
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost', 'history', '/products/42?tab=orders'), '/app/products/42?tab=orders&__unplugin-pageflow_preview=1')
    assert.equal(resolvePreviewUrl('/machinery/orders/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: {},
      previewRoles: [{ match: '/machinery/**', role: 'operator' }],
    }, 'http://localhost', 'history', '/machinery/orders/42?tab=dispatch'), '/app/machinery/orders/42?tab=dispatch&__unplugin-pageflow_preview=1&__unplugin-pageflow_role=operator')
  } finally {
    await server.close()
  }
})
