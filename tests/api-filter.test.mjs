import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('右侧面板只保留业务接口', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { is3dTilesRequest, isBusinessApiResponse, isLocalBusinessApiResponse } = await server.ssrLoadModule('/src/runtime/api-filter.ts')
    assert.equal(isBusinessApiResponse('/api/orders', 'application/json; charset=utf-8'), true)
    assert.equal(isBusinessApiResponse('/api/export-status', 'text/plain'), true)
    assert.equal(isBusinessApiResponse('https://tiles.example.com/12/3412/1678.png', 'image/png'), false)
    assert.equal(isBusinessApiResponse('https://tiles.example.com/vt?x=1&y=2', 'application/vnd.mapbox-vector-tile'), false)
    assert.equal(isBusinessApiResponse('https://wprd01.is.autonavi.com/appmaptile?x=3412&y=1678&z=12&style=7'), false)
    assert.equal(isBusinessApiResponse('/geoserver/wmts?service=WMTS&request=GetTile&tileRow=1&tileCol=2&tileMatrix=3'), false)
    assert.equal(isBusinessApiResponse('/assets/app.js', 'application/javascript'), false)
    assert.equal(isBusinessApiResponse('/fonts/app.woff2', 'font/woff2'), false)
    assert.equal(isLocalBusinessApiResponse('/prod-api/orders', 'http://localhost:5173', 'application/json'), true)
    assert.equal(isLocalBusinessApiResponse('https://restapi.amap.com/v3/geocode/geo', 'http://localhost:5173', 'application/json'), false)
    assert.equal(isLocalBusinessApiResponse('/prod-api/map/data?x=3412&y=1678&z=12', 'http://localhost:5173', 'application/octet-stream'), false)
    assert.equal(isLocalBusinessApiResponse('/prod-api/map/12/3412/1678', 'http://localhost:5173'), false)
    assert.equal(is3dTilesRequest('/3dtiles/tileset.json'), true)
    assert.equal(is3dTilesRequest('https://tiles.example.com/root/12/34/terrain.b3dm?token=x'), true)
    assert.equal(is3dTilesRequest('/assets/models/tractor.glb'), false)
    assert.equal(isBusinessApiResponse('/3dtiles/tileset.json', 'application/json'), false)
    assert.equal(isBusinessApiResponse('/3dtiles/12/terrain.b3dm', 'application/octet-stream'), false)
  } finally {
    await server.close()
  }
})
