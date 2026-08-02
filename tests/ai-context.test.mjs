import assert from 'node:assert/strict'
import test from 'node:test'
import { createPageFlowAIContext, createPageFlowAIPrompt } from '../src/client/ai-context.ts'

test('creates model-independent page context and repair prompt', () => {
  const context = createPageFlowAIContext(
    { title: '个人中心', path: '/pages/mine', sourceFile: 'src/pages/mine.vue' },
    {
      diagnostics: [{
        id: 'nested-interactive:button',
        ruleId: 'nested-interactive',
        severity: 'error',
        category: 'interaction',
        title: '交互控件相互嵌套',
        description: '移除内部按钮。',
        selector: 'a > button',
      }],
      requests: [],
      tests: [],
      links: [{ label: '账号信息', to: '/pages/account' }],
    },
    '2026-08-02T00:00:00.000Z',
  )

  assert.deepEqual(context.page, { title: '个人中心', path: '/pages/mine', sourceFile: 'src/pages/mine.vue' })
  assert.equal(context.lighthouse, null)
  assert.equal(context.diagnostics[0].severity, 'error')

  const prompt = createPageFlowAIPrompt(context)
  assert.match(prompt, /PageFlow 页面上下文/)
  assert.match(prompt, /影响正常使用/)
  assert.match(prompt, /\/pages\/mine/)
  assert.match(prompt, /src\/pages\/mine\.vue/)
  assert.match(prompt, /nested-interactive/)
})
