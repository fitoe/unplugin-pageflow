const ASSET_EXTENSION = /\.(?:avif|bmp|css|eot|gif|ico|jpe?g|js|mjs|map|mvt|otf|pbf|png|svg|tiff?|ttf|wasm|webm|webp|woff2?)$/i
const TILE_PATH = /(?:^|\/)(?:appmaptile|maptile|sateTiles|tile|tiles|wmts)(?:\/|$)/i
const TILE_COORDINATE_PATH = /(?:^|\/)\d{1,2}\/-?\d+\/-?\d+$/
const THREE_DIMENSIONAL_TILE_PATH = /(?:^|\/)(?:3dtiles|tileset)(?:\/|$)|\/(?:tileset\.json|[^/]+\.(?:b3dm|i3dm|pnts|cmpt|subtree))$/i

export interface ApiResultLike {
  id: string
  method: string
  url: string
  status: number
  duration: number
  occurredAt?: number
  occurrences?: number
  lastIntervalMs?: number
}

export function is3dTilesRequest(url: string) {
  try {
    return THREE_DIMENSIONAL_TILE_PATH.test(new URL(url, 'http://pageflow.local').pathname)
  } catch {
    return THREE_DIMENSIONAL_TILE_PATH.test(url.split(/[?#]/, 1)[0] ?? '')
  }
}

export function isBusinessApiResponse(url: string, contentType = '') {
  const path = url.split(/[?#]/, 1)[0] ?? ''
  if (ASSET_EXTENSION.test(path) || TILE_PATH.test(path) || TILE_COORDINATE_PATH.test(path) || is3dTilesRequest(url)) return false
  try {
    const parsed = new URL(url, 'http://pageflow.local')
    const parameters = new Map([...parsed.searchParams].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]))
    if (parameters.get('request') === 'gettile' || parameters.get('service') === 'wmts') return false
    if (parameters.has('tilematrix') || parameters.has('tilerow') || parameters.has('tilecol')) return false
    if (parameters.has('x') && parameters.has('y') && parameters.has('z')) return false
    if (parameters.has('zoom') && parameters.has('row') && parameters.has('col')) return false
    if (parameters.has('level') && parameters.has('row') && parameters.has('col')) return false
  } catch {}
  const mediaType = (contentType.split(';', 1)[0] ?? '').trim().toLowerCase()
  if (/^(?:audio|font|image|video)\//.test(mediaType)) return false
  if (/^(?:text\/css|text\/javascript|application\/(?:javascript|octet-stream|protobuf|wasm|x-protobuf|vnd\.mapbox-vector-tile))$/.test(mediaType)) return false
  return true
}

export function isLocalBusinessApiResponse(url: string, origin: string, contentType = '') {
  try {
    if (new URL(url, origin).origin !== new URL(origin).origin) return false
  } catch {
    return false
  }
  return isBusinessApiResponse(url, contentType)
}

export function apiRequestKey(result: Pick<ApiResultLike, 'method' | 'url'>) {
  let path = result.url.split(/[?#]/, 1)[0] ?? ''
  try {
    path = new URL(result.url, 'http://pageflow.local').pathname
  } catch {}
  return `${result.method.toUpperCase()}:${path}`
}

export function mergeApiResult<T extends ApiResultLike>(results: T[], incoming: T): T[] {
  const key = apiRequestKey(incoming)
  const previous = results.find(result => apiRequestKey(result) === key)
  const merged = previous ? {
    ...incoming,
    id: key,
    occurrences: (previous.occurrences ?? 1) + 1,
    lastIntervalMs: previous.occurredAt != null && incoming.occurredAt != null
      ? Math.max(0, incoming.occurredAt - previous.occurredAt)
      : undefined,
  } : { ...incoming, id: key, occurrences: 1 }
  return [...results.filter(result => apiRequestKey(result) !== key), merged as T].slice(-30)
}
