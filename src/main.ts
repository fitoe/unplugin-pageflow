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
})
