import { ref, type Ref } from 'vue'
import type { PageFlowPage, ResolvedPageFlowOptions } from '../shared/types.ts'
import { createRouteDeckView, routeDeckPathForPage } from './layout.ts'
import { previewRole } from './preview.ts'
import {
  assignGroupUser,
  cachedPreviewUsers,
  configuredUsers,
  loadUserSessions,
  saveUserSessions,
  visibleSessionUsers,
} from './user-sessions.ts'

interface PageDeck {
  key: string
  pages: PageFlowPage[]
  representative: PageFlowPage
}

export type PageUserSource = 'page' | 'group' | 'route' | 'global'

export interface PageUserResolution {
  user: string | undefined
  source: PageUserSource
  groupKey?: string
}

export function usePageUsers(
  pages: Ref<PageFlowPage[]>,
  config: ResolvedPageFlowOptions,
  deckForPage: (pageId: string) => PageDeck | undefined,
) {
  const initial = loadUserSessions()
  const users = ref(visibleSessionUsers(initial.users, config.previewRoles, cachedPreviewUsers()))
  const userNotes = ref<Record<string, string>>(initial.notes)
  const activeUser = ref(users.value.includes(initial.activeUser ?? '') ? initial.activeUser : users.value[0])
  const pageUsers = ref<Record<string, string>>(Object.fromEntries(
    Object.entries(initial.pageUsers).filter(([, user]) => users.value.includes(user)),
  ))
  const groupUsers = ref<Record<string, string>>(initial.groupUsers)
  let groupPathPages: PageFlowPage[] | undefined
  let groupPathsByPage = new Map<string, string[]>()

  function pageGroupPath(page: PageFlowPage) {
    if (groupPathPages !== pages.value) {
      groupPathPages = pages.value
      groupPathsByPage = new Map()
    }
    const cached = groupPathsByPage.get(page.id)
    if (cached) return cached
    const path = routeDeckPathForPage(pages.value, page.id)
    groupPathsByPage.set(page.id, path)
    return path
  }

  function save(selectedUser = activeUser.value) {
    const configured = new Set(configuredUsers(config.previewRoles))
    saveUserSessions({
      users: users.value.filter(user => !configured.has(user)),
      notes: userNotes.value,
      activeUser: selectedUser,
      pageUsers: pageUsers.value,
      groupUsers: groupUsers.value,
    })
  }

  function refresh() {
    const next = visibleSessionUsers(initial.users, config.previewRoles, cachedPreviewUsers())
    if (JSON.stringify(next) === JSON.stringify(users.value)) return
    users.value = next
    if (!users.value.includes(activeUser.value ?? '')) activeUser.value = users.value[0]
  }

  function pageUserResolution(page: PageFlowPage): PageUserResolution {
    const explicitUser = pageUsers.value[page.id]
    if (explicitUser) return { user: explicitUser, source: 'page' }
    const groupPath = pageGroupPath(page)
    for (let depth = groupPath.length; depth > 0; depth--) {
      const groupKey = groupPath.slice(0, depth).join('/')
      const configuredGroupUser = groupUsers.value[groupKey]
      if (configuredGroupUser) return { user: configuredGroupUser, source: 'group', groupKey }
      const parentPath = groupPath.slice(0, depth - 1)
      const representative = createRouteDeckView(pages.value, parentPath).decks
        .find(deck => deck.key === groupKey)?.representative
      const inheritedUser = representative && pageUsers.value[representative.id]
      if (inheritedUser) return { user: inheritedUser, source: 'group', groupKey }
    }
    const routeUser = previewRole(page.path, config)
    return routeUser
      ? { user: routeUser, source: 'route' }
      : { user: activeUser.value, source: 'global' }
  }

  function pageUser(page: PageFlowPage) {
    return pageUserResolution(page).user
  }

  function selectActiveUser(user: string) {
    activeUser.value = user
    save(user)
  }

  function selectPageUser(pageId: string, user: string) {
    const deck = deckForPage(pageId)
    if (deck) {
      groupUsers.value = assignGroupUser(groupUsers.value, deck.key, user)
      const pageIds = new Set(deck.pages.map(page => page.id))
      pageUsers.value = Object.fromEntries(Object.entries(pageUsers.value).filter(([id]) => !pageIds.has(id)))
    } else {
      pageUsers.value = { ...pageUsers.value, [pageId]: user }
    }
    save()
  }

  function restorePageUser(pageId: string) {
    const deck = deckForPage(pageId)
    if (deck) {
      const { [deck.key]: _removed, ...nextGroupUsers } = groupUsers.value
      groupUsers.value = nextGroupUsers
    } else {
      const { [pageId]: _removed, ...nextPageUsers } = pageUsers.value
      pageUsers.value = nextPageUsers
    }
    save()
  }

  function setUserNote(user: string, note: string) {
    userNotes.value = { ...userNotes.value, [user]: note.trim() }
    save()
  }

  function migrateLegacyGroups(nextPages: PageFlowPage[]) {
    if (Object.keys(groupUsers.value).length) return
    const migratedGroups: Record<string, string> = {}
    const migratedPageUsers = { ...pageUsers.value }
    const visit = (items: PageFlowPage[], path: string[] = []) => {
      createRouteDeckView(items, path).decks.forEach((deck) => {
        const user = migratedPageUsers[deck.representative.id]
        if (user) {
          migratedGroups[deck.key] = user
          deck.pages.forEach(page => delete migratedPageUsers[page.id])
        }
        visit(deck.pages, [...path, deck.label])
      })
    }
    visit(nextPages)
    if (!Object.keys(migratedGroups).length) return
    groupUsers.value = migratedGroups
    pageUsers.value = migratedPageUsers
    save()
  }

  return {
    activeUser,
    groupUsers,
    pageUsers,
    users,
    userNotes,
    migrateLegacyGroups,
    pageGroupPath,
    pageUser,
    pageUserResolution,
    refresh,
    restorePageUser,
    save,
    selectActiveUser,
    selectPageUser,
    setUserNote,
  }
}
