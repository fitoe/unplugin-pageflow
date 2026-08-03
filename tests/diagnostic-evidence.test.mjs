import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('从多段页面快照裁剪诊断元素证据', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { centerDiagnosticTransform, navigationDiagnosticBounds, planDiagnosticEvidence } = await server.ssrLoadModule('/src/client/diagnostic-evidence.ts')
    const navigationBounds = navigationDiagnosticBounds({
      navigation: { method: 'push', target: '/about?from=home' },
      targetLabel: 'button“关于我们”',
    }, [
      { label: '其它入口', to: '/about', hotspot: { centerX: 0.2, centerY: 0.3 } },
      { label: '关于我们', to: '/about', hotspot: { centerX: 0.75, centerY: 0.5 } },
    ], { width: 1200, height: 800 })
    assert.deepEqual(navigationBounds, { x: 878, y: 378, width: 44, height: 44 })

    const evidence = planDiagnosticEvidence(
      { x: 600, y: 730, width: 240, height: 120 },
      [
        { source: 'first.webp', sourceWidth: 2880, height: 120, tileTop: 0 },
        { source: 'second.webp', sourceWidth: 2880, height: 120, tileTop: 120 },
      ],
      1440,
    )
    assert(evidence)
    assert.deepEqual(evidence.layers.map(layer => layer.source), ['first.webp', 'second.webp'])
    assert.equal(evidence.width, 300)
    assert.equal(evidence.height, 175)
    assert(evidence.marker.width > 0)
    assert(evidence.marker.height > 0)
    assert(evidence.layers[0].width > evidence.width)

    const largeElementEvidence = planDiagnosticEvidence(
      { x: 0, y: 0, width: 1440, height: 800 },
      [{ source: 'page.webp', sourceWidth: 1440, height: 800 }],
      1440,
    )
    assert(largeElementEvidence)
    assert.equal(largeElementEvidence.width, 300)
    assert(Math.abs(largeElementEvidence.height - 173.333) < 0.001)
    assert(largeElementEvidence.marker.width <= largeElementEvidence.width)
    assert(largeElementEvidence.marker.height <= largeElementEvidence.height)

    const centered = centerDiagnosticTransform(
      { x: 600, y: 730, width: 240, height: 120 },
      [100, 200],
      1440,
      { width: 1000, height: 800 },
      2,
    )
    assert.equal(centered.x, 60)
    assert(Math.abs(centered.y + 263.333) < 0.001)
    assert.deepEqual([centered.scaleX, centered.scaleY], [2, 2])
  } finally {
    await server.close()
  }
})
