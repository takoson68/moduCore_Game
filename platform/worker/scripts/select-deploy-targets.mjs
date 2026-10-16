import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const all = [
  { target: 'dinecore-staging', project: 'dineCore' },
  { target: 'project-b-staging', project: 'project-b' },
]

// 專案私有修改只發布自身；共用 Runtime、建置、Worker 與 Workflow 修改發布兩站。
export function selectTargets(paths) {
  const selected = new Set()
  for (const path of paths) {
    const project = /^platform\/frontend\/projects\/([^/]+)\//.exec(path)?.[1]
    if (project) {
      for (const target of all) if (target.project === project) selected.add(target.target)
      continue
    }
    const config = /^platform\/worker\/wrangler\.(dinecore-staging|project-b-staging)\.json$/.exec(path)?.[1]
    if (config) { selected.add(config); continue }
    if (path === 'platform/worker/wrangler.jsonc') continue
    if (path.startsWith('platform/frontend/') || path.startsWith('platform/worker/') ||
        path === '.github/workflows/deploy-staging.yml') return all
  }
  return all.filter(target => selected.has(target.target))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let targets = all
  const before = process.env.DEPLOY_BEFORE
  const after = process.env.DEPLOY_AFTER
  if (process.env.DEPLOY_EVENT === 'push' && /^[a-f0-9]{40}$/.test(before ?? '') &&
      !/^0+$/.test(before) && /^[a-f0-9]{40}$/.test(after ?? '')) {
    const paths = execFileSync('git', ['diff', '--name-only', before, after], { encoding: 'utf8' })
      .split('\n').filter(Boolean)
    targets = selectTargets(paths)
  }
  appendFileSync(process.env.GITHUB_OUTPUT,
    `matrix=${JSON.stringify({ include: targets })}\nhas-targets=${targets.length > 0}\n`)
  console.log(`本次部署目標：${targets.map(target => target.target).join(', ') || '無（未影響已部署專案）'}`)
}
