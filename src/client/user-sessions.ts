export interface PageFlowUserSessions {
  users: string[]
  activeUser?: string
  pageUsers: Record<string, string>
}

const STORAGE_KEY = 'unplugin-pageflow:user-sessions'

export function configuredUsers(previewRoles: Array<{ role: string }>) {
  return [...new Set(previewRoles.map(item => item.role).filter(Boolean))]
}

export function loadUserSessions(storage: Pick<Storage, 'getItem'> = localStorage): PageFlowUserSessions {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? '')
    return {
      users: Array.isArray(value?.users) ? value.users.filter((user: unknown) => typeof user === 'string' && user) : [],
      activeUser: typeof value?.activeUser === 'string' ? value.activeUser : undefined,
      pageUsers: value?.pageUsers && typeof value.pageUsers === 'object' ? value.pageUsers : {},
    }
  } catch {
    return { users: [], pageUsers: {} }
  }
}

export function saveUserSessions(sessions: PageFlowUserSessions, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {}
}
