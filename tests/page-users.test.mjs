import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { ref } from 'vue'
import { createRouteDeckView } from '../src/client/layout.ts'
import { usePageUsers } from '../src/client/page-users.ts'

test('page users assign a visible group once and preserve configured fallbacks', () => {
  const window = new Window({ url: 'http://localhost/' })
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage })
  const pages = ref([
    { id: 'home', path: '/pages/inspection/home/index', title: 'Home', accent: '#fff', links: [] },
    { id: 'report', path: '/pages/inspection/report/index', title: 'Report', accent: '#fff', links: [] },
    { id: 'farmer', path: '/pages/farmer/mine/index', title: 'Mine', accent: '#fff', links: [] },
  ])
  const visibleDecks = createRouteDeckView(pages.value, []).decks
  const session = usePageUsers(pages, {
    previewRoles: [
      { match: '/pages/inspection/**', role: 'inspection' },
      { match: '/pages/farmer/**', role: 'farmer' },
    ],
  }, pageId => visibleDecks.find(deck => deck.representative.id === pageId))

  assert.equal(session.pageUser(pages.value[2]), 'farmer')
  assert.deepEqual(session.pageUserResolution(pages.value[2]), { user: 'farmer', source: 'route' })
  session.selectPageUser('home', 'inspection-user')
  assert.equal(session.groupUsers.value.inspection, 'inspection-user')
  assert.equal(session.pageUser(pages.value[0]), 'inspection-user')
  assert.equal(session.pageUser(pages.value[1]), 'inspection-user')
  assert.deepEqual(session.pageUserResolution(pages.value[1]), { user: 'inspection-user', source: 'group', groupKey: 'inspection' })
  assert.deepEqual(session.pageUsers.value, {})
  session.restorePageUser('home')
  assert.equal(session.pageUser(pages.value[0]), 'inspection')
  assert.deepEqual(session.pageUserResolution(pages.value[0]), { user: 'inspection', source: 'route' })
})
