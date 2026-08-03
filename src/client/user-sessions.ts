export interface PageFlowUserSessions {
  users: string[]
  notes: Record<string, string>
  activeUser?: string
  pageUsers: Record<string, string>
}

const STORAGE_KEY = 'unplugin-pageflow:user-sessions'
const PAGE_STATE_PREFIX = 'unplugin-pageflow:page-state:'

export function isPreviewUserStorageKey(key: string | null): key is string {
  return Boolean(key?.startsWith(PAGE_STATE_PREFIX))
}

export function configuredUsers(previewRoles: Array<{ role: string }>) {
  return [...new Set(previewRoles.map(item => item.role).filter(Boolean))]
}

export function cachedPreviewUsers(storage: Pick<Storage, 'length' | 'key'> = localStorage) {
  const users: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (!isPreviewUserStorageKey(key)) continue
    const encodedUser = key.slice(PAGE_STATE_PREFIX.length).split(':', 1)[0]
    if (!encodedUser) continue
    try {
      users.push(decodeURIComponent(encodedUser))
    } catch {}
  }
  return [...new Set(users)]
}

export function visibleSessionUsers(savedUsers: string[], previewRoles: Array<{ role: string }>, cachedUsers: string[]) {
  const configured = configuredUsers(previewRoles)
  const configuredSet = new Set(configured)
  const manuallyAdded = savedUsers.filter(user => user !== '默认用户' && !configuredSet.has(user))
  const visitedRoles = cachedUsers.filter(user => configuredSet.has(user))
  const users = [...new Set([...configured, ...manuallyAdded, ...visitedRoles])]
  return users.length ? users : ['默认用户']
}

export function loadUserSessions(storage: Pick<Storage, 'getItem'> = localStorage): PageFlowUserSessions {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? '')
    return {
      users: Array.isArray(value?.customUsers) ? value.customUsers.filter((user: unknown) => typeof user === 'string' && user) : [],
      notes: value?.notes && typeof value.notes === 'object' ? value.notes : {},
      activeUser: typeof value?.activeUser === 'string' ? value.activeUser : undefined,
      pageUsers: value?.pageUsers && typeof value.pageUsers === 'object' ? value.pageUsers : {},
    }
  } catch {
    return { users: [], notes: {}, pageUsers: {} }
  }
}

export function saveUserSessions(sessions: PageFlowUserSessions, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    const { users, ...rest } = sessions
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, customUsers: users }))
  } catch {}
}
