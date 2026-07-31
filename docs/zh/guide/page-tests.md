# 页面测试

PageFlow 可以把路由与单元测试、组件测试和端到端测试关联起来，并从当前页面运行明确配置的命令。

## 自动关联

测试导入页面组件、遵循同名文件约定，或在测试用例中导航到完整路由时，可以被自动关联。PageFlow 会显示每个关联的来源。

## 显式映射

自动关联存在歧义时，使用路由和文件 glob：

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## 测试命令

PageFlow 默认不会猜测或启用命令。请显式配置每种测试类型。

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}` 和 `{name}` 会替换为索引到的测试文件与用例名称。命令从项目根目录运行，并设置 `shell: false`。默认超时为 120 秒，`timeoutMs` 支持 1 秒到 30 分钟。

## 测试结果

页面面板会显示未运行、运行中、通过、失败、跳过或已取消状态。运行中的测试可以取消。测试能力只存在于开发环境。

