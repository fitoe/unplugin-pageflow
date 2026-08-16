import type {
  PageFlowFormControlDescriptor,
  PageFlowFormControlKind,
  PageFlowFormFillResult,
  PageFlowFormScanResult,
  PageFlowFormValue,
} from '@pageflow/core/types'
import { faker } from '@faker-js/faker/locale/zh_CN'

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

interface ScannedControl {
  descriptor: PageFlowFormControlDescriptor
  element: FormControl | HTMLElement
  picker?: boolean
}

interface FormControlSnapshot {
  id: string
  value: string
  checked?: boolean
}

let lastFillSnapshot: FormControlSnapshot[] | undefined

function normalizedText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function explicitControlName(element: Element) {
  const labelledBy = element.getAttribute('aria-labelledby')
    ?.split(/\s+/)
    .map(id => normalizedText(element.ownerDocument.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ')
  const labels = 'labels' in element
    ? [...((element as FormControl).labels ?? [])].map(label => normalizedText(label.textContent)).filter(Boolean).join(' ')
    : ''
  return normalizedText(element.getAttribute('aria-label'))
    || normalizedText(labelledBy)
    || normalizedText(labels)
}

function isFieldContainer(element: Element) {
  if (['label', 'uni-label'].includes(element.localName)) return true
  return [...element.classList].some(token => /(?:^|[-_])(?:forms?[-_]?item|field|cell)$/i.test(token))
}

function contextualControlName(element: Element) {
  let branch: Element = element
  let container = element.parentElement
  for (let depth = 0; container && depth < 8; depth++, branch = container, container = container.parentElement) {
    if (!isFieldContainer(container)) continue
    const labelledDescendant = [...container.querySelectorAll<Element>('[class*="label"], [class*="title"], legend')]
      .find(candidate => !candidate.contains(element) && normalizedText(candidate.textContent))
    const directLabel = [...container.children]
      .filter(candidate => candidate !== branch && !candidate.contains(element))
      .map(candidate => normalizedText(candidate.textContent))
      .find(text => text && text.length <= 80)
    const inferred = normalizedText(labelledDescendant?.textContent) || directLabel
    if (inferred) return inferred
  }
  return ''
}

function controlSemanticText(element: Element) {
  return [
    element.getAttribute('data-pageflow-fill'),
    element.getAttribute('autocomplete'),
    explicitControlName(element),
    contextualControlName(element),
    element.getAttribute('placeholder'),
    element.getAttribute('name'),
    element.id,
  ].filter(Boolean).join(' ')
}

export function isPageFlowSensitiveControl(element: FormControl) {
  if (element.localName === 'input' && ['password', 'file'].includes((element as HTMLInputElement).type)) return true
  return /(?:captcha|verify|verification|one-time-code|otp|sms.?code|验证码|校验码|短信码)/i.test(controlSemanticText(element))
}

export function pageFlowFormControlIdentity(element: Element) {
  const declared = element.getAttribute('data-pageflow-state')
  if (declared) return `data:${declared}`
  const name = element.getAttribute('name')
  if (name) return `name:${name}`
  if (element.id) return `id:${element.id}`
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== element.ownerDocument.body) {
    const siblings = current.parentElement
      ? [...current.parentElement.children].filter(sibling => sibling.tagName === current!.tagName)
      : []
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${Math.max(1, siblings.indexOf(current) + 1)})`)
    current = current.parentElement
  }
  return `path:${parts.join('>')}`
}

function selectorFor(element: Element) {
  const escape = (value: string) => element.ownerDocument.defaultView?.CSS?.escape?.(value)
    ?? value.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`)
  if (element.id) return `#${escape(element.id)}`
  const testId = element.getAttribute('data-testid')
  if (testId) return `[data-testid="${escape(testId)}"]`
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== element.ownerDocument.documentElement && parts.length < 6) {
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

function accessibleName(element: Element) {
  return explicitControlName(element)
    || contextualControlName(element)
    || normalizedText(element.getAttribute('placeholder'))
    || normalizedText(element.getAttribute('name'))
    || normalizedText(element.id)
    || '未命名字段'
}

function controlKind(element: FormControl): PageFlowFormControlKind | undefined {
  if (element.localName === 'textarea') return 'textarea'
  if (element.localName === 'select') return 'select'
  const type = (element as HTMLInputElement).type.toLowerCase()
  if (['text', 'email', 'tel', 'url', 'search', 'number', 'date', 'datetime-local', 'time', 'radio', 'checkbox'].includes(type))
    return type as PageFlowFormControlKind
}

function unavailable(element: FormControl) {
  if (element.disabled || element.hidden || element.closest('[hidden], [aria-hidden="true"]')) return true
  if ('readOnly' in element && element.readOnly) return true
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  return style?.display === 'none' || style?.visibility === 'hidden'
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clampText(value: string, element: FormControl) {
  const maxLength = 'maxLength' in element && element.maxLength > 0 ? element.maxLength : undefined
  return maxLength ? value.slice(0, maxLength) : value
}

function numericValue(element: HTMLInputElement) {
  const numericAttribute = (name: 'min' | 'max' | 'step') => {
    const raw = element.getAttribute(name)?.trim()
    if (!raw) return Number.NaN
    return Number(raw)
  }
  const minimum = numericAttribute('min')
  const maximum = numericAttribute('max')
  const step = numericAttribute('step')
  const min = Number.isFinite(minimum) ? minimum : 1
  const max = Number.isFinite(maximum) ? maximum : Math.max(min, 100)
  let value = faker.number.int({ min: Math.ceil(Math.min(min, max)), max: Math.floor(Math.max(min, max)) })
  // uni-app renders type="digit" with a tiny synthetic step (1e-18). An integer
  // already satisfies that constraint; aligning it introduces floating noise.
  if (Number.isFinite(step) && step > 0 && (element.hasAttribute('min') || step >= 1))
    value = min + Math.round((value - min) / step) * step
  return String(value)
}

function dateValue(element: HTMLInputElement, kind: PageFlowFormControlKind) {
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const recent = faker.date.between({ from: oneYearAgo, to: now })
  let value = kind === 'time'
    ? `${String(faker.number.int({ min: 8, max: 18 })).padStart(2, '0')}:${faker.helpers.arrayElement(['00', '15', '30', '45'])}`
    : kind === 'datetime-local'
      ? `${formatLocalDate(recent)}T${String(faker.number.int({ min: 8, max: 18 })).padStart(2, '0')}:${faker.helpers.arrayElement(['00', '15', '30', '45'])}`
      : formatLocalDate(recent)
  if (element.min && value < element.min) value = element.min
  if (element.max && value > element.max) value = element.max
  return value
}

function identityCardValue() {
  const regionCode = faker.helpers.fromRegExp(/[1-6][0-9]{5}/)
  const birthday = formatLocalDate(faker.date.birthdate({ min: 18, max: 65, mode: 'age' })).replaceAll('-', '')
  const sequence = faker.string.numeric(3)
  const body = `${regionCode}${birthday}${sequence}`
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checksums = '10X98765432'
  const checksum = checksums[[...body].reduce((sum, digit, index) => sum + Number(digit) * weights[index]!, 0) % 11]
  return `${body}${checksum}`
}

function generatedText(element: FormControl, kind: PageFlowFormControlKind) {
  const semantic = controlSemanticText(element).toLowerCase()
  if (kind === 'email' || /(?:e-?mail|邮箱|邮件)/i.test(semantic)) return faker.internet.email({ allowSpecialCharacters: false })
  if (kind === 'tel' || /(?:mobile|phone|tel|手机号|手机|电话)/i.test(semantic)) return faker.helpers.fromRegExp(/1[3-9][0-9]{9}/)
  if (kind === 'url' || /(?:website|homepage|网址|网站)/i.test(semantic)) return faker.internet.url()
  if (/(?:company|enterprise|organization|企业|公司|单位|合作社)/i.test(semantic)) return faker.company.name()
  if (/(?:address|location|street|地址|住址|所在地)/i.test(semantic)) return faker.location.streetAddress({ useFullAddress: true })
  if (/(?:real.?name|full.?name|contact.?name|姓名|联系人)/i.test(semantic)) return faker.person.fullName()
  if (/(?:id.?card|identity|身份证|证件号码)/i.test(semantic)) return identityCardValue()
  if (/(?:user.?name|account|账号|用户名)/i.test(semantic)) return faker.internet.username()
  if (/(?:title|subject|标题|主题)/i.test(semantic)) return faker.commerce.productName()
  if (kind === 'textarea' || /(?:description|remark|comment|content|简介|描述|备注|内容)/i.test(semantic)) return faker.commerce.productDescription()
  if (kind === 'search' || /(?:keyword|query|search|关键词|搜索)/i.test(semantic)) return faker.commerce.productName()
  return faker.commerce.productName()
}

function suggestedValue(element: FormControl, id: string, kind: PageFlowFormControlKind, radioDefault: boolean): PageFlowFormValue {
  if (kind === 'checkbox') return element.required ? true : (element as HTMLInputElement).checked
  if (kind === 'radio') return radioDefault
  if (kind === 'select') {
    const options = [...(element as HTMLSelectElement).options]
    return options.find(option => !option.disabled && option.value !== '')?.value
      ?? options.find(option => !option.disabled)?.value
      ?? element.value
  }
  if (kind === 'number') {
    const semantic = controlSemanticText(element)
    if (/(?:mobile|phone|tel|手机号|手机|电话)/i.test(semantic)) return clampText(generatedText(element, kind), element)
    return numericValue(element as HTMLInputElement)
  }
  if (['date', 'datetime-local', 'time'].includes(kind)) return dateValue(element as HTMLInputElement, kind)
  return clampText(generatedText(element, kind), element)
}

function pickerDescriptor(element: HTMLElement, id: string): PageFlowFormControlDescriptor | undefined {
  const systemInput = element.querySelector<HTMLInputElement>('.uni-picker-system_input')
  if (systemInput) {
    const kind = systemInput.type === 'time' ? 'time' : 'date'
    return {
      id,
      identity: pageFlowFormControlIdentity(element),
      selector: selectorFor(element),
      label: accessibleName(element),
      kind: 'picker',
      required: element.hasAttribute('required'),
      value: systemInput.value,
      suggestedValue: dateValue(systemInput, kind),
      min: normalizedText(systemInput.min) || undefined,
      max: normalizedText(systemInput.max) || undefined,
    }
  }
  const items = [...element.querySelectorAll<HTMLElement>('.uni-picker-select > .uni-picker-item')]
  if (!items.length) return undefined
  const selectedIndex = items.findIndex(item => item.classList.contains('selected'))
  return {
    id,
    identity: pageFlowFormControlIdentity(element),
    selector: selectorFor(element),
    label: accessibleName(element),
    kind: 'picker',
    required: element.hasAttribute('required'),
    value: selectedIndex >= 0 ? String(selectedIndex) : '',
    suggestedValue: '0',
    options: items.map((item, index) => ({ value: String(index), label: normalizedText(item.textContent) || String(index) })),
  }
}

function applyPickerValue(element: HTMLElement, value: string) {
  const systemInput = element.querySelector<HTMLInputElement>('.uni-picker-system_input')
  if (systemInput) {
    setNativeValue(systemInput, value)
    dispatchFormEvents(systemInput)
    return
  }
  const container = element.querySelector<HTMLElement>('.uni-picker-container')
  const items = [...(container?.querySelectorAll<HTMLElement>('.uni-picker-select > .uni-picker-item') ?? [])]
  const index = Number(value)
  const item = Number.isInteger(index) ? items[index] : undefined
  if (!item) throw new Error('选择器没有可用选项')
  element.click()
  item.click()
}

function scanControls(document: Document): { controls: ScannedControl[], skipped: PageFlowFormScanResult['skipped'] } {
  const skipped = { sensitive: 0, unavailable: 0, unsupported: 0 }
  const candidates = [...document.querySelectorAll<FormControl>('input, textarea, select')]
  const eligible: Array<{ element: FormControl, identity: string, kind: PageFlowFormControlKind }> = []
  candidates.forEach((element) => {
    if (element.closest('uni-picker')) return
    if (isPageFlowSensitiveControl(element)) {
      skipped.sensitive++
      return
    }
    if (element.getAttribute('data-pageflow-fill')?.trim().toLowerCase() === 'skip') {
      skipped.unsupported++
      return
    }
    if (unavailable(element)) {
      skipped.unavailable++
      return
    }
    const kind = controlKind(element)
    if (!kind) {
      skipped.unsupported++
      return
    }
    eligible.push({ element, identity: pageFlowFormControlIdentity(element), kind })
  })
  const occurrences = new Map<string, number>()
  const firstRadio = new Set<string>()
  const controls: ScannedControl[] = eligible.map(({ element, identity, kind }) => {
    const occurrence = occurrences.get(identity) ?? 0
    occurrences.set(identity, occurrence + 1)
    const id = `${identity}#${occurrence}`
    const radioGroup = kind === 'radio' ? (element.getAttribute('name') || identity) : ''
    const radioDefault = kind === 'radio' && !firstRadio.has(radioGroup)
    if (radioDefault) firstRadio.add(radioGroup)
    const input = element as HTMLInputElement
    const descriptor: PageFlowFormControlDescriptor = {
      id,
      identity,
      selector: selectorFor(element),
      label: accessibleName(element),
      kind,
      required: element.required,
      value: kind === 'checkbox' || kind === 'radio' ? input.checked : element.value,
      suggestedValue: suggestedValue(element, id, kind, radioDefault),
      placeholder: normalizedText(element.getAttribute('placeholder')) || undefined,
      min: normalizedText(element.getAttribute('min')) || undefined,
      max: normalizedText(element.getAttribute('max')) || undefined,
      step: normalizedText(element.getAttribute('step')) || undefined,
      maxLength: 'maxLength' in element && element.maxLength > 0 ? element.maxLength : undefined,
      options: kind === 'select'
        ? [...(element as HTMLSelectElement).options].map(option => ({ value: option.value, label: normalizedText(option.textContent) || option.value, disabled: option.disabled || undefined }))
        : undefined,
    }
    return { descriptor, element }
  })
  document.querySelectorAll<HTMLElement>('uni-picker').forEach((element) => {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.closest('[hidden], [aria-hidden="true"]')) {
      skipped.unavailable++
      return
    }
    const identity = pageFlowFormControlIdentity(element)
    const occurrence = occurrences.get(identity) ?? 0
    occurrences.set(identity, occurrence + 1)
    const descriptor = pickerDescriptor(element, `${identity}#${occurrence}`)
    if (!descriptor) {
      skipped.unsupported++
      return
    }
    controls.push({ descriptor, element, picker: true })
  })
  return { controls, skipped }
}

export function scanPageFlowFormControls(document: Document = window.document): PageFlowFormScanResult {
  const result = scanControls(document)
  return { controls: result.controls.map(item => item.descriptor), skipped: result.skipped }
}

function setNativeValue(element: FormControl, value: string) {
  const view = element.ownerDocument.defaultView
  const prototype = element.localName === 'input'
    ? view?.HTMLInputElement?.prototype
    : element.localName === 'textarea'
      ? view?.HTMLTextAreaElement?.prototype
      : view?.HTMLSelectElement?.prototype
  const setter = prototype && Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(element, value)
  else element.value = value
}

function setNativeChecked(element: HTMLInputElement, value: boolean) {
  const prototype = element.ownerDocument.defaultView?.HTMLInputElement?.prototype
  const setter = prototype && Object.getOwnPropertyDescriptor(prototype, 'checked')?.set
  if (setter) setter.call(element, value)
  else element.checked = value
}

function dispatchFormEvents(element: FormControl) {
  const view = element.ownerDocument.defaultView
  const EventConstructor = view?.Event ?? Event
  element.dispatchEvent(new EventConstructor('input', { bubbles: true }))
  element.dispatchEvent(new EventConstructor('change', { bubbles: true }))
}

function emptyFillResult(): PageFlowFormFillResult {
  return { applied: [], skipped: [], missing: [], errors: [], canUndo: Boolean(lastFillSnapshot?.length) }
}

export function applyPageFlowFormValues(
  values: Record<string, PageFlowFormValue>,
  document: Document = window.document,
): PageFlowFormFillResult {
  const result = emptyFillResult()
  const scanned = scanControls(document).controls
  const byId = new Map(scanned.map(item => [item.descriptor.id, item]))
  const snapshot: FormControlSnapshot[] = []
  Object.entries(values).forEach(([id, value]) => {
    const item = byId.get(id)
    if (!item) {
      result.missing.push(id)
      return
    }
    const { descriptor, element } = item
    if ((descriptor.kind === 'checkbox' || descriptor.kind === 'radio') && typeof value !== 'boolean') {
      result.skipped.push({ id, reason: '此字段需要布尔值' })
      return
    }
    if (descriptor.kind !== 'checkbox' && descriptor.kind !== 'radio' && typeof value !== 'string') {
      result.skipped.push({ id, reason: '此字段需要文本值' })
      return
    }
    let snapshotAdded = false
    try {
      if (item.picker) {
        applyPickerValue(element as HTMLElement, value as string)
        result.applied.push(id)
        return
      }
      const nativeElement = element as FormControl
      snapshot.push({ id, value: nativeElement.value, checked: nativeElement.localName === 'input' ? (nativeElement as HTMLInputElement).checked : undefined })
      snapshotAdded = true
      if (typeof value === 'boolean') setNativeChecked(nativeElement as HTMLInputElement, value)
      else setNativeValue(nativeElement, clampText(value, nativeElement))
      dispatchFormEvents(nativeElement)
      result.applied.push(id)
    } catch (error) {
      if (snapshotAdded) snapshot.pop()
      result.errors.push({ id, message: error instanceof Error ? error.message : '字段填充失败' })
    }
  })
  if (snapshot.length) lastFillSnapshot = snapshot
  result.canUndo = Boolean(lastFillSnapshot?.length)
  return result
}

export function undoPageFlowFormFill(document: Document = window.document): PageFlowFormFillResult {
  const result = emptyFillResult()
  const snapshot = lastFillSnapshot
  if (!snapshot?.length) return result
  const byId = new Map(scanControls(document).controls.filter(item => !item.picker).map(item => [item.descriptor.id, item.element as FormControl]))
  snapshot.forEach((item) => {
    const element = byId.get(item.id)
    if (!element) {
      result.missing.push(item.id)
      return
    }
    try {
      setNativeValue(element, item.value)
      if (item.checked !== undefined && element.localName === 'input') setNativeChecked(element as HTMLInputElement, item.checked)
      dispatchFormEvents(element)
      result.applied.push(item.id)
    } catch (error) {
      result.errors.push({ id: item.id, message: error instanceof Error ? error.message : '字段恢复失败' })
    }
  })
  lastFillSnapshot = undefined
  result.canUndo = false
  return result
}
