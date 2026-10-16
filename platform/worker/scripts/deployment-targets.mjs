import { readFileSync } from 'node:fs'

// 僅接受固定的 Staging 目標，不接受任意 URL／資料庫或由前端選擇資源。
const targets = {
  'dinecore-staging': { project: 'dineCore', databaseId: '10230112-5e9d-4ed7-ad17-d836896e64b1' },
  'project-b-staging': { project: 'project-b', databaseId: 'd446407c-6c4b-4746-b0fb-7368d850986c' },
}

export function deploymentTarget(name = 'legacy') {
  if (name === 'legacy') return {
    name: 'moducore-staging', project: 'dineCore', database: 'moducore-staging-db',
    databaseId: 'ca7c6025-e575-4ec1-9b63-780086fa997b', config: 'wrangler.jsonc',
    base: 'https://moducore-staging.takoson68.workers.dev',
  }
  if (!Object.hasOwn(targets, name)) throw new Error('未知部署目標')
  const expected = targets[name]
  const config = `wrangler.${name}.json`
  const parsed = JSON.parse(readFileSync(new URL(`../${config}`, import.meta.url), 'utf8'))
  const db = parsed.d1_databases?.[0]
  if (parsed.name !== name || parsed.vars?.PROJECT_ID !== expected.project ||
      parsed.vars?.SERVICE_NAME !== name || parsed.d1_databases.length !== 1 ||
      db?.binding !== 'DB' || db.database_name !== `${name}-db` || db.database_id !== expected.databaseId ||
      parsed.assets?.directory !== `.assets/${name}`) throw new Error('部署目標設定不一致，停止操作')
  return { name, project: expected.project, config, database: db.database_name,
    databaseId: db.database_id, base: `https://${name}.takoson68.workers.dev` }
}
