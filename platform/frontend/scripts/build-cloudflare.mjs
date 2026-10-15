import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Cloudflare 的預設測試專案固定為 project-a，不繼承本機 .env 的專案選擇。
// 可由 CI 或呼叫端的 VITE_PROJECT 明確切換；保留原有 npm run build 行為。
const project = process.env.VITE_PROJECT || 'project-a'
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
  'build', ...process.argv.slice(2),
], {
  stdio: 'inherit',
  env: { ...process.env, MODUCORE_DEPLOY_TARGET: 'cloudflare', VITE_PROJECT: project },
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
