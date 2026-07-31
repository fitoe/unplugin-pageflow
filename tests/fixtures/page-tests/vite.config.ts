import { defineConfig } from 'vite'
import unpluginPageFlow from '../../../src/plugin'

export default defineConfig({
  plugins: [unpluginPageFlow.vite({
    testCommands: {
      e2e: {
        command: process.execPath,
        args: ['-e', "if (process.argv[1].includes('profile')) setInterval(() => {}, 1000); else console.log('pageflow test ok')", '{name}'],
      },
    },
  })],
})
