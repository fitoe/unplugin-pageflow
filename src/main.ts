import { mountPageFlow } from './client/mount'

mountPageFlow(document.querySelector('#app'), {
  enabled: true,
  previewPath: '/',
  appUrl: '/',
  dynamicParams: {},
  previewRoles: [],
  groupNames: {},
})
