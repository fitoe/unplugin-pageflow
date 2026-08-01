import { defineConfig } from 'vite'
import unpluginPageFlow from '../../../src/plugin'

export default defineConfig({
  plugins: [unpluginPageFlow.vite({
    testCommands: {
      e2e: {
        command: process.execPath,
        args: ['-e', "if (process.argv[1].includes('profile')) setInterval(() => {}, 1000); else { const text = Buffer.from('测试通过'); process.stdout.write('\\u001B[32m'); process.stdout.write(text.subarray(0, 1)); setTimeout(() => { process.stdout.write(text.subarray(1)); console.log('\\u001B[0m pageflow test ok') }, 10) }", '{name}'],
      },
    },
  })],
})
