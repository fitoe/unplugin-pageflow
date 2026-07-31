import assert from 'node:assert/strict'
import test from 'node:test'
import * as napiCanvas from '@napi-rs/canvas'
import { Group, Leafer, Rect, useCanvas } from '@leafer/node'

useCanvas('napi', napiCanvas)

test('runs Leafer layout, picking, rendering, and cleanup in the official Node environment', async () => {
  const leafer = new Leafer({ width: 320, height: 240 })
  const group = new Group({ x: 30, y: 40 })
  const card = new Rect({
    id: 'page-card',
    x: 20,
    y: 10,
    width: 120,
    height: 80,
    fill: '#ffffff',
    stroke: '#999999',
  })
  group.add(card)
  leafer.add(group)

  try {
    leafer.updateLayout()

    assert.deepEqual(card.getBounds('box', 'world'), {
      x: 50,
      y: 50,
      width: 120,
      height: 80,
    })
    assert.equal(leafer.pick({ x: 60, y: 60 }).target, card)
  assert.equal(leafer.pick({ x: 250, y: 200 }).target, undefined)

    const image = await leafer.export('png', { screenshot: true })
    assert.equal(image.error, undefined)
    assert.equal(image.width, 320)
    assert.equal(image.height, 240)
    assert.match(image.data, /^data:image\/png;base64,/)
  } finally {
    leafer.destroy(true)
  }

  assert.equal(leafer.destroyed, true)
  assert.equal(group.destroyed, true)
  assert.equal(card.destroyed, true)
  assert.equal(card.parent, null)
})
