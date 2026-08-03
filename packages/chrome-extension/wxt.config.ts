import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'PageFlow',
    description: '在独立画板中查看页面流、接口、诊断和 Todo。',
    action: { default_title: '打开 PageFlow' },
    permissions: ['storage', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
})
