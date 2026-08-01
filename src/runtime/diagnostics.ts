import type { PageFlowDiagnostic } from '../shared/types'
import type axeCore from 'axe-core'

const INTERACTIVE_SELECTOR = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), uni-button, uni-navigator'
const IGNORED_SELECTOR = '[hidden], [aria-hidden="true"], [inert], [data-unplugin-pageflow-hotspot-layer], [data-unplugin-pageflow-diagnostic-highlight]'
const MINIMUM_FONT_SIZE = 12
const MINIMUM_TAP_SIZE = 44
const TEXT_SELECTOR = 'p, span, label, li, td, th, small, code, [role="text"], h1, h2, h3, h4, h5, h6, a, button'

interface RgbColor { red: number, green: number, blue: number, alpha: number }

function rgbColor(value: string): RgbColor | undefined {
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i)
  if (!match) return
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha: match[4] == null ? 1 : Number(match[4]),
  }
}

function luminance(color: RgbColor) {
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)
}

function contrastRatio(foreground: RgbColor, background: RgbColor) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function effectiveBackground(element: Element) {
  let current: Element | null = element
  while (current) {
    const style = window.getComputedStyle(current)
    if (style.backgroundImage && style.backgroundImage !== 'none') return
    const color = rgbColor(style.backgroundColor)
    if (color?.alpha === 1) return color
    if (color && color.alpha > 0) return
    current = current.parentElement
  }
  return { red: 255, green: 255, blue: 255, alpha: 1 }
}

function hasOwnText(element: Element) {
  return [...element.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim())
}

function visible(element: Element) {
  if (element.closest(IGNORED_SELECTOR)) return false
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
    && rect.width > 0 && rect.height > 0
}

function disabled(element: Element) {
  return element.getAttribute('aria-disabled') === 'true'
    || ('disabled' in element && Boolean((element as HTMLButtonElement).disabled))
}

function elementSelector(element: Element) {
  const escape = (value: string) => globalThis.CSS?.escape?.(value) ?? value.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`)
  if (element.id) return `#${escape(element.id)}`
  const testId = element.getAttribute('data-testid')
  if (testId) return `[data-testid="${escape(testId)}"]`
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== document.documentElement && parts.length < 5) {
    let part = current.tagName.toLowerCase()
    const parent: Element | null = current.parentElement
    if (parent) {
      const siblings = [...parent.children].filter(child => child.tagName === current!.tagName)
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`
    }
    parts.unshift(part)
    current = parent
  }
  return parts.join(' > ')
}

function shortText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return
  return normalized.length > 40 ? `${normalized.slice(0, 39)}…` : normalized
}

function diagnosticTargetLabel(element: Element | undefined) {
  if (!element) return
  const name = shortText(accessibleName(element)
    || element.getAttribute('alt')
    || element.getAttribute('placeholder'))
  if (element instanceof HTMLImageElement) return name ? `图片“${name}”` : '未命名图片'
  if (element.matches('button, [role="button"], uni-button')) return name ? `按钮“${name}”` : '未命名按钮'
  if (element.matches('a, [role="link"], uni-navigator')) return name ? `链接“${name}”` : '未命名链接'
  if (element.matches('input, select, textarea')) return name ? `输入框“${name}”` : '未命名输入框'
  return name ? `文本“${name}”` : element.tagName.toLowerCase()
}

function diagnostic(ruleId: string, severity: PageFlowDiagnostic['severity'], category: PageFlowDiagnostic['category'], title: string, description: string, element?: Element, measured?: PageFlowDiagnostic['measured']): PageFlowDiagnostic {
  const selector = element ? elementSelector(element) : undefined
  return {
    id: `${ruleId}:${selector ?? 'page'}`,
    ruleId,
    severity,
    category,
    title,
    description,
    selector,
    targetLabel: diagnosticTargetLabel(element),
    measured,
    source: 'pageflow',
  }
}

function diagnosticElement(item: PageFlowDiagnostic) {
  if (!item.selector) return
  try {
    return document.querySelector(item.selector) ?? undefined
  } catch {
    return
  }
}

function sameVisualArea(left: Element, right: Element) {
  const leftRect = left.getBoundingClientRect()
  const rightRect = right.getBoundingClientRect()
  const intersectionWidth = Math.max(0, Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left))
  const intersectionHeight = Math.max(0, Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top))
  const largestArea = Math.max(leftRect.width * leftRect.height, rightRect.width * rightRect.height)
  return largestArea > 0 && intersectionWidth * intersectionHeight / largestArea >= 0.8
}

function deduplicateNestedDiagnostics(items: PageFlowDiagnostic[]) {
  const results: PageFlowDiagnostic[] = []
  for (const item of items) {
    const element = diagnosticElement(item)
    if (!element) {
      results.push(item)
      continue
    }
    const duplicateIndex = results.findIndex((candidate) => {
      if (candidate.ruleId !== item.ruleId) return false
      const candidateElement = diagnosticElement(candidate)
      return Boolean(candidateElement
        && (candidateElement.contains(element) || element.contains(candidateElement))
        && sameVisualArea(candidateElement, element))
    })
    if (duplicateIndex < 0) results.push(item)
    else {
      const duplicateElement = diagnosticElement(results[duplicateIndex])
      if (duplicateElement?.contains(element)) results[duplicateIndex] = item
    }
  }
  return results
}

function accessibleName(element: Element) {
  const labelledBy = element.getAttribute('aria-labelledby')
    ?.split(/\s+/)
    .map(id => document.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(' ')
  const labels = 'labels' in element
    ? [...((element as HTMLInputElement).labels ?? [])].map(label => label.textContent?.trim()).filter(Boolean).join(' ')
    : ''
  return element.getAttribute('aria-label')?.trim()
    || labelledBy
    || labels
    || element.getAttribute('title')?.trim()
    || element.textContent?.trim()
    || (element instanceof HTMLInputElement && element.type === 'button' ? element.value.trim() : '')
}

export function scanCustomPageDiagnostics() {
  const results: PageFlowDiagnostic[] = []
  const elements = [...document.body.querySelectorAll('*')].filter(visible)
  const duplicateIds = new Map<string, Element[]>()
  document.querySelectorAll('[id]').forEach((element) => {
    if (!element.id || !visible(element)) return
    const matches = duplicateIds.get(element.id) ?? []
    matches.push(element)
    duplicateIds.set(element.id, matches)
  })

  duplicateIds.forEach((matches, id) => {
    if (matches.length < 2) return
    results.push(diagnostic('duplicate-id', 'suggestion', 'accessibility', '页面存在重复 id', `id “${id}” 出现 ${matches.length} 次，应保持唯一。`, matches[0], { count: matches.length }))
  })

  let previousHeadingLevel = 0

  for (const element of elements) {
    if (element instanceof HTMLImageElement && !element.hasAttribute('alt')) {
      results.push(diagnostic('missing-alt', 'suggestion', 'accessibility', '图片缺少 alt', '为图片提供替代文本；装饰图片使用空 alt。', element))
    }
    if (element instanceof HTMLImageElement && (!element.hasAttribute('width') || !element.hasAttribute('height'))) {
      results.push(diagnostic('missing-image-dimensions', 'suggestion', 'visual', '图片缺少固定尺寸', '添加 width 和 height，减少图片加载时的布局偏移。', element))
    }

    if (element.matches('a[href]')) {
      const href = element.getAttribute('href')?.trim() ?? ''
      if (!href || href === '#' || /^javascript:/i.test(href))
        results.push(diagnostic('invalid-link-target', 'error', 'interaction', '链接目标无效', '提供可访问的真实地址，避免空链接、# 或 javascript:。', element))
    }

    if (/^H[1-6]$/.test(element.tagName)) {
      const level = Number(element.tagName.slice(1))
      if (previousHeadingLevel && level > previousHeadingLevel + 1) {
        results.push(diagnostic('heading-order', 'suggestion', 'accessibility', '标题层级跳跃', `标题从 H${previousHeadingLevel} 跳到 H${level}，请保持连续层级。`, element, {
          previousLevel: previousHeadingLevel,
          currentLevel: level,
        }))
      }
      previousHeadingLevel = level
    }

    const interactive = element.matches(INTERACTIVE_SELECTOR)
    const interactiveEnabled = interactive && !disabled(element)

    if (interactiveEnabled && !accessibleName(element)) {
      results.push(diagnostic('missing-accessible-name', 'error', 'accessibility', '交互元素缺少名称', '添加可见文字、aria-label 或关联标签。', element))
    }

    if (interactiveEnabled) {
      const rect = element.getBoundingClientRect()
      if (rect.width < MINIMUM_TAP_SIZE || rect.height < MINIMUM_TAP_SIZE) {
        results.push(diagnostic('tap-target-too-small', 'warning', 'interaction', '点击区域太小', `点击区域建议至少为 ${MINIMUM_TAP_SIZE}×${MINIMUM_TAP_SIZE}px。`, element, {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }))
      }
    }

    if (element.matches(TEXT_SELECTOR) && element.textContent?.trim()) {
      const fontSize = Number.parseFloat(window.getComputedStyle(element).fontSize)
      if (fontSize > 0 && fontSize < MINIMUM_FONT_SIZE) {
        results.push(diagnostic('font-size-too-small', 'suggestion', 'visual', '字号太小', `当前字号 ${fontSize}px，建议正文不小于 ${MINIMUM_FONT_SIZE}px。`, element, { fontSize }))
      }
    }

    if (element.matches(TEXT_SELECTOR) && hasOwnText(element)) {
      const style = window.getComputedStyle(element)
      const foreground = rgbColor(style.color)
      const background = effectiveBackground(element)
      if (foreground?.alpha === 1 && background) {
        const fontSize = Number.parseFloat(style.fontSize)
        const fontWeight = Number.parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400)
        const threshold = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5
        const ratio = contrastRatio(foreground, background)
        if (ratio < threshold) {
          results.push(diagnostic('low-text-contrast', 'warning', 'visual', '文字对比度不足', `当前对比度 ${ratio.toFixed(2)}:1，建议至少 ${threshold}:1。`, element, {
            ratio: Number(ratio.toFixed(2)),
            requiredRatio: threshold,
          }))
        }
      }
    }

    if (interactiveEnabled && element.querySelector(INTERACTIVE_SELECTOR)) {
      results.push(diagnostic('nested-interactive', 'error', 'interaction', '交互控件相互嵌套', '移除内部按钮或链接，确保一个区域只有一个交互目标。', element))
    }
  }

  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth + 1) {
    results.push(diagnostic('horizontal-overflow', 'warning', 'visual', '页面存在横向溢出', '检查超宽元素、固定宽度和负边距。', undefined, {
      viewportWidth: root.clientWidth,
      contentWidth: root.scrollWidth,
    }))
  }

  return deduplicateNestedDiagnostics([...new Map(results.map(item => [item.id, item])).values()])
}

const AXE_REPLACED_RULES = new Set(['missing-alt', 'missing-accessible-name', 'nested-interactive', 'heading-order', 'low-text-contrast'])
const axeRuleIds: Record<string, string> = {
  'image-alt': 'missing-alt',
  'button-name': 'missing-accessible-name',
  'input-button-name': 'missing-accessible-name',
  'link-name': 'missing-accessible-name',
  'select-name': 'missing-accessible-name',
  'label': 'missing-accessible-name',
  'nested-interactive': 'nested-interactive',
  'heading-order': 'heading-order',
  'color-contrast': 'low-text-contrast',
}

const diagnosticSeverityByRule: Partial<Record<string, PageFlowDiagnostic['severity']>> = {
  'missing-alt': 'suggestion',
  'heading-order': 'suggestion',
  'duplicate-id': 'suggestion',
  'missing-image-dimensions': 'suggestion',
  'font-size-too-small': 'suggestion',
  'tap-target-too-small': 'warning',
  'low-text-contrast': 'warning',
  'horizontal-overflow': 'warning',
  'missing-accessible-name': 'error',
  'invalid-link-target': 'error',
  'nested-interactive': 'error',
}

function axeSeverity(ruleId: string, impact: axeCore.ImpactValue | null | undefined): PageFlowDiagnostic['severity'] {
  const knownSeverity = diagnosticSeverityByRule[ruleId]
  if (knownSeverity) return knownSeverity
  if (impact === 'critical') return 'error'
  if (impact === 'serious' || impact === 'moderate') return 'warning'
  return 'suggestion'
}

async function runPageDiagnostics() {
  const custom = scanCustomPageDiagnostics()
  try {
    const [{ default: axe }, { default: locale }] = await Promise.all([
      import('axe-core'),
      import('axe-core/locales/zh_CN.json'),
    ])
    axe.configure({ locale: locale as unknown as axeCore.Locale })
    const report = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      rules: { 'target-size': { enabled: true } },
    })
    const axeDiagnostics = report.violations.flatMap((violation) => violation.nodes.map((node, index): PageFlowDiagnostic => {
      const selector = typeof node.target[0] === 'string' ? node.target[0] : undefined
      const element = selector ? diagnosticElement({ selector } as PageFlowDiagnostic) : undefined
      const ruleId = axeRuleIds[violation.id] ?? `axe:${violation.id}`
      return {
        id: `${ruleId}:${selector ?? index}`,
        ruleId,
        severity: axeSeverity(ruleId, violation.impact),
        category: 'accessibility',
        title: violation.help,
        description: node.failureSummary ?? violation.description,
        selector,
        targetLabel: diagnosticTargetLabel(element),
        source: 'axe',
      }
    }))
    return deduplicateNestedDiagnostics([...new Map([
      ...custom.filter(item => !AXE_REPLACED_RULES.has(item.ruleId)),
      ...axeDiagnostics,
    ].map(item => [item.id, item])).values()])
  } catch {
    return custom
  }
}

let diagnosticsRevision = 0
let diagnosticsObserver: MutationObserver | undefined
let cachedDiagnostics: { revision: number, diagnostics: PageFlowDiagnostic[] } | undefined
let diagnosticsInFlight: { revision: number, promise: Promise<PageFlowDiagnostic[]> } | undefined

function mutationAffectsDiagnostics(record: MutationRecord) {
  if (record.type !== 'childList')
    return !(record.target instanceof Element && record.target.closest(IGNORED_SELECTOR))
  const changedNodes = [...record.addedNodes, ...record.removedNodes]
  return changedNodes.some((node) => {
    if (!(node instanceof Element)) return true
    return !node.matches(IGNORED_SELECTOR) && !node.closest(IGNORED_SELECTOR)
  })
}

function observeDiagnosticMutations() {
  diagnosticsObserver?.observe(document.documentElement, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })
}

function trackDiagnosticMutations() {
  if (diagnosticsObserver) {
    if (diagnosticsObserver.takeRecords().some(mutationAffectsDiagnostics)) diagnosticsRevision++
    return
  }
  diagnosticsObserver = new MutationObserver((records) => {
    if (records.some(mutationAffectsDiagnostics)) diagnosticsRevision++
  })
  observeDiagnosticMutations()
}

export function scanPageDiagnostics() {
  trackDiagnosticMutations()
  if (cachedDiagnostics?.revision === diagnosticsRevision) return Promise.resolve(cachedDiagnostics.diagnostics)
  if (diagnosticsInFlight?.revision === diagnosticsRevision) return diagnosticsInFlight.promise
  const revision = diagnosticsRevision
  diagnosticsObserver?.disconnect()
  const promise = runPageDiagnostics().then((diagnostics) => {
    if (revision === diagnosticsRevision) cachedDiagnostics = { revision, diagnostics }
    return diagnostics
  }).finally(() => {
    observeDiagnosticMutations()
    if (diagnosticsInFlight?.promise === promise) diagnosticsInFlight = undefined
  })
  diagnosticsInFlight = { revision, promise }
  return promise
}

let diagnosticHighlight: HTMLElement | undefined

export function highlightDiagnosticElement(selector: string) {
  diagnosticHighlight?.remove()
  diagnosticHighlight = undefined
  let element: Element | null = null
  try {
    element = document.querySelector(selector)
  } catch {
    return false
  }
  if (!element) return false
  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
  const rect = element.getBoundingClientRect()
  const overlay = document.createElement('div')
  const ripple = document.createElement('div')
  overlay.setAttribute('data-unplugin-pageflow-diagnostic-highlight', '')
  Object.assign(overlay.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    left: `${rect.left - 3}px`,
    top: `${rect.top - 3}px`,
    width: `${rect.width + 6}px`,
    height: `${rect.height + 6}px`,
    border: '2px solid #ef4444',
    borderRadius: '8px',
    boxSizing: 'border-box',
    boxShadow: '0 0 0 3px rgb(239 68 68 / 20%)',
  })
  Object.assign(ripple.style, {
    position: 'absolute',
    inset: '-2px',
    border: '2px solid #ef4444',
    borderRadius: 'inherit',
    boxSizing: 'border-box',
  })
  overlay.append(ripple)
  document.body.append(overlay)
  ripple.animate([
    { opacity: 0.8, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(1.35)' },
  ], { duration: 900, easing: 'ease-out', iterations: 3 })
  diagnosticHighlight = overlay
  window.setTimeout(() => {
    if (diagnosticHighlight !== overlay) return
    overlay.remove()
    diagnosticHighlight = undefined
  }, 3_000)
  return true
}
