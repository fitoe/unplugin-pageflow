import { mountPageFlow } from './client/mount'

mountPageFlow(document.querySelector('#app'), {
  enabled: true,
  framework: 'vite',
  routes: [],
  previewPath: '/',
  appUrl: '/',
  dynamicParams: {},
  previewRoles: [],
  groupNames: {},
  pageTests: {},
  testCommands: {},
  diagnostics: { minimumFontSize: 12, minimumTapSize: 44, ignoreSelectors: [], rules: {} },
  apiDiagnostics: { slowRequestMs: 1_000, largeResponseBytes: 500_000, duplicateWindowMs: 1_000 },
})
