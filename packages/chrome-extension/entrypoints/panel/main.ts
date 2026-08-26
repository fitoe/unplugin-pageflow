import 'virtual:pageflow-icon-css'
import { mountPageFlow } from '../../../../src/client/mount'
import type { ResolvedPageFlowOptions } from '../../../../src/shared/types'
import { resolvePageFlowApiDiagnosticOptions, resolvePageFlowDiagnosticOptions } from '../../../../src/shared/options'
import { ChromePageFlowHost } from '../../utils/chrome-host'
import { loadVitePageFlowProject } from '../../utils/vite-project'

const target = document.querySelector('#app')
const tabId = Number(new URLSearchParams(location.search).get('tabId'))
if (!target || !Number.isInteger(tabId) || tabId <= 0) throw new Error('PageFlow 未绑定业务标签页')
const host = new ChromePageFlowHost(tabId)
const session = await browser.runtime.sendMessage({ type: 'pageflow:start-session', tabId }) as { ok: boolean; error?: string }
if (session?.ok) host.enableBackgroundCapture()
else console.info('PageFlow using injected network fallback', session?.error)
window.addEventListener('pagehide', () => {
  void browser.runtime.sendMessage({ type: 'pageflow:stop-session', tabId })
}, { once: true })
const state = await host.loadState()
const appUrl = new URL(state.currentUrl).origin
const project = await loadVitePageFlowProject(appUrl, await host.configUrl())
host.setSupplementalPages(project.pages ?? [])
const config: ResolvedPageFlowOptions = {
  enabled: true,
  launcher: false,
  framework: 'vite',
  routes: [],
  previewPath: '/__pageflow_chrome__/',
  appUrl,
  dynamicParams: {},
  previewRoles: [],
  groupNames: project.groupNames ?? {},
  pageNames: project.pageNames ?? {},
  figmaPages: project.figmaPages ?? {},
  canvasLayouts: project.canvasLayouts ?? {},
  pageTests: {},
  testCommands: {},
  diagnostics: resolvePageFlowDiagnosticOptions(),
  apiDiagnostics: resolvePageFlowApiDiagnosticOptions(),
  configFile: { loaded: project.loaded, source: project.source },
}

mountPageFlow(target, config, host)
