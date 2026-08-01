import type { PageFlowDiagnostic } from '../shared/types.ts'

const NAVIGATION_CALL = String.raw`(?:uni\s*\.\s*(navigateTo|redirectTo|switchTab|reLaunch)\s*\(\s*\{\s*url\s*:\s*|(?:[A-Za-z_$][\w$]*|\$router|useRouter\(\s*\))\s*\.\s*(push|replace)\s*\(\s*)["'\x60]([^"'\x60$]+)["'\x60]\s*\}?\s*\)`

interface StaticNavigation {
  method: string
  target: string
}

function lineAt(source: string, offset: number) {
  return source.slice(0, offset).split('\n').length
}

function labelForTag(tag: string, attributes: string, body: string) {
  const named = attributes.match(/(?:aria-label|title)\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim()
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\{\{.*?\}\}/g, ' ').replace(/\s+/g, ' ').trim()
  const label = named || text
  return label ? `${tag}“${label.slice(0, 40)}”` : tag
}

function pureNavigationHandlers(source: string) {
  const handlers = new Map<string, StaticNavigation>()
  const patterns = [
    new RegExp(String.raw`\bfunction\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*\{\s*${NAVIGATION_CALL}\s*;?\s*\}`, 'g'),
    new RegExp(String.raw`\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(\s*\)\s*=>\s*(?:\{\s*)?${NAVIGATION_CALL}\s*;?\s*\}?`, 'g'),
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) handlers.set(match[1], {
      method: match[2] ?? match[3],
      target: match[4],
    })
  }
  return handlers
}

export function extractEventNavigationDiagnostics(source: string, file: string): PageFlowDiagnostic[] {
  const template = source.match(/<template(?:\s[^>]*)?>([\s\S]*?)<\/template>/i)
  if (!template || template.index == null) return []
  const templateBodyOffset = template.index + template[0].indexOf(template[1])
  const handlers = pureNavigationHandlers(source)
  const results: PageFlowDiagnostic[] = []
  const tagPattern = /<([\w-]+)([^>]*\s@(?:click|tap)(?:\.[\w-]+)*\s*=\s*(["'])(.*?)\3[^>]*)>([\s\S]*?)<\/\1\s*>/gi
  const directCall = new RegExp(`^\\s*${NAVIGATION_CALL}\\s*;?\\s*$`)

  for (const match of template[1].matchAll(tagPattern)) {
    const expression = match[4].trim()
    const direct = expression.match(directCall)
    const navigation = direct
      ? { method: direct[1] ?? direct[2], target: direct[3] }
      : /^[A-Za-z_$][\w$]*$/.test(expression) ? handlers.get(expression) : undefined
    if (!navigation?.target.startsWith('/')) continue
    const line = lineAt(source, templateBodyOffset + match.index!)
    const target = navigation.target
    results.push({
      id: `event-navigation:${file}:${line}`,
      ruleId: 'event-navigation',
      severity: 'suggestion',
      category: 'interaction',
      title: '纯跳转事件可以使用链接',
      description: `该事件只跳转到 ${target}，可考虑改用链接组件扩大可点击区域并保留原布局。`,
      targetLabel: labelForTag(match[1], match[2], match[5]),
      measured: { source: `${file}:${line}` },
      source: 'pageflow',
      navigation: { method: navigation.method, target },
    })
    const declaredTarget = match[2].match(/\s(?:href|url)\s*=\s*(["'])(\/[^"']+)\1/i)?.[2]
    if (declaredTarget) {
      results.push({
        id: `duplicate-navigation:${file}:${line}`,
        ruleId: 'duplicate-navigation',
        severity: 'warning',
        category: 'interaction',
        title: '同一元素存在重复跳转',
        description: `该元素已有链接 ${declaredTarget}，同时又通过事件跳转到 ${target}，可能触发重复或冲突导航。`,
        targetLabel: labelForTag(match[1], match[2], match[5]),
        measured: { source: `${file}:${line}` },
        source: 'pageflow',
        navigation: { method: navigation.method, target },
      })
    }
  }
  return results
}
