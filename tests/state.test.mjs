import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import * as stateModule from '../src/runtime/state.ts'

async function loadState(window) {
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    requestAnimationFrame: callback => window.setTimeout(() => callback(0), 0),
  })
  return { module: stateModule, close: () => Promise.resolve() }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

test('explicit page state restores and stays isolated by query and role', async () => {
  const window = new Window({ url: 'http://localhost/form?id=7&__unplugin-pageflow_preview=1&__unplugin-pageflow_role=farmer' })
  const { module, close } = await loadState(window)
  let value = { tab: 'first' }
  const stop = module.definePageFlowState('filters', {
    get: () => value,
    restore: state => { value = state },
  })
  value = { tab: 'second' }
  await wait(450)
  stop()

  value = { tab: 'empty' }
  const stopRestored = module.definePageFlowState('filters', {
    get: () => value,
    restore: state => { value = state },
  })
  await wait(20)
  assert.deepEqual(value, { tab: 'second' })
  stopRestored()

  window.history.replaceState({}, '', '/form?id=8&__unplugin-pageflow_preview=1&__unplugin-pageflow_role=farmer')
  value = { tab: 'query-isolated' }
  const stopQuery = module.definePageFlowState('filters', { get: () => value, restore: state => { value = state } })
  await wait(20)
  assert.deepEqual(value, { tab: 'query-isolated' })
  stopQuery()

  window.history.replaceState({}, '', '/form?id=7&__unplugin-pageflow_preview=1&__unplugin-pageflow_role=operator')
  value = { tab: 'role-isolated' }
  const stopRole = module.definePageFlowState('filters', { get: () => value, restore: state => { value = state } })
  await wait(20)
  assert.deepEqual(value, { tab: 'role-isolated' })
  stopRole()
  await close()
})

test('DOM fallback restores controls but never stores sensitive fields', async () => {
  const window = new Window({ url: 'http://localhost/profile?__unplugin-pageflow_preview=1' })
  window.scrollTo = () => {}
  const { module, close } = await loadState(window)
  window.document.body.innerHTML = `
    <select name="role"><option value="farmer">Farmer</option><option value="expert">Expert</option></select>
    <input name="remember" type="checkbox">
    <input name="password" type="password">
    <input name="captchaCode" value="1234">
  `
  const select = window.document.querySelector('select')
  const checkbox = window.document.querySelector('[name=remember]')
  const password = window.document.querySelector('[name=password]')
  let changes = 0
  select.addEventListener('change', () => changes++)
  const stop = module.startPageFlowDomStatePersistence()
  select.value = 'expert'
  checkbox.checked = true
  password.value = 'secret'
  select.dispatchEvent(new window.Event('change', { bubbles: true }))
  await wait(400)
  stop()

  select.value = 'farmer'
  checkbox.checked = false
  password.value = ''
  const stopRestored = module.startPageFlowDomStatePersistence()
  await wait(80)
  assert.equal(select.value, 'expert')
  assert.equal(checkbox.checked, true)
  assert.equal(password.value, '')
  assert.ok(changes >= 2)
  assert.doesNotMatch([...Array(window.localStorage.length)].map((_, index) => window.localStorage.getItem(window.localStorage.key(index))).join(''), /secret|1234/)
  stopRestored()
  await close()
})

test('state persistence is inert outside PageFlow preview', async () => {
  const window = new Window({ url: 'http://localhost/form' })
  const { module, close } = await loadState(window)
  let value = 'original'
  const stop = module.definePageFlowState('sample', { get: () => value, restore: state => { value = state } })
  value = 'changed'
  await wait(450)
  stop()
  assert.equal(window.localStorage.length, 0)
  await close()
})

test('legacy preview and role parameters remain compatible', async () => {
  const window = new Window({ url: 'http://localhost/legacy?__unplugin_pageflow_preview=1&__unplugin_pageflow_role=farmer' })
  const { module, close } = await loadState(window)
  let value = 'first'
  const stop = module.definePageFlowState('legacy', { get: () => value, restore: state => { value = state } })
  value = 'saved'
  await wait(450)
  stop()

  value = 'empty'
  const stopRestored = module.definePageFlowState('legacy', { get: () => value, restore: state => { value = state } })
  await wait(20)
  assert.equal(value, 'saved')
  stopRestored()
  await close()
})
