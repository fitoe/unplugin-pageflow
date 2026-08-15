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
  session.selectPageUser('home', 'inspection-user')
  assert.equal(session.groupUsers.value.inspection, 'inspection-user')
  assert.equal(session.pageUser(pages.value[0]), 'inspection-user')
  assert.equal(session.pageUser(pages.value[1]), 'inspection-user')
  assert.deepEqual(session.pageUsers.value, {})
})
