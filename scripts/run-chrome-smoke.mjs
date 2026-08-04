import { spawn } from 'node:child_process'

const child = spawn(process.execPath, ['--test', 'tests/chrome-extension.e2e.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PAGEFLOW_E2E_EXTENSION_DIR: 'packages/chrome-extension/.output-enhanced/chrome-mv3',
  },
})
child.once('exit', code => process.exitCode = code ?? 1)
