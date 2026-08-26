import { mountPageFlow } from './client/mount'
import { resolvePageFlowApiDiagnosticOptions, resolvePageFlowDiagnosticOptions } from './shared/options'

mountPageFlow(document.querySelector('#app'), {
  enabled: true,
  launcher: true,
  framework: 'vite',
  routes: [],
  previewPath: '/',
  appUrl: '/',
  dynamicParams: {},
  previewRoles: [],
  groupNames: {},
  pageNames: {},
  figmaPages: {},
  pageLocations: {},
  canvasLayouts: {},
  pageTests: {},
  testCommands: {},
  diagnostics: resolvePageFlowDiagnosticOptions(),
  apiDiagnostics: resolvePageFlowApiDiagnosticOptions(),
})
