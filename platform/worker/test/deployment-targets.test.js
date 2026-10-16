import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deploymentTarget } from '../scripts/deployment-targets.mjs'
import { selectTargets } from '../scripts/select-deploy-targets.mjs'

test('固定目標各自核對 Project、網址、設定與獨立 D1', () => {
  const a = deploymentTarget('dinecore-staging')
  const b = deploymentTarget('project-b-staging')
  assert.equal(a.project, 'dineCore')
  assert.equal(b.project, 'project-b')
  for (const key of ['config', 'base', 'database', 'databaseId']) assert.notEqual(a[key], b[key])
  assert.equal(deploymentTarget().name, 'moducore-staging')
  for (const name of ['../wrangler', 'toString', 'https://example.test', 'production']) {
    assert.throws(() => deploymentTarget(name))
  }
})

test('CI 專案變更只發布自身，共用變更發布兩站，文件不發布', () => {
  const names = paths => selectTargets(paths).map(t => t.target)
  assert.deepEqual(names(['platform/frontend/projects/dineCore/project.config.js']), ['dinecore-staging'])
  assert.deepEqual(names(['platform/frontend/projects/project-b/modules/employee/index.js']), ['project-b-staging'])
  assert.deepEqual(names(['platform/worker/wrangler.project-b-staging.json']), ['project-b-staging'])
  assert.equal(names(['platform/worker/src/index.js']).length, 2)
  assert.equal(names(['platform/frontend/src/world.js']).length, 2)
  assert.deepEqual(names(['_workspace/CURRENT_WORK.md', 'AGENTS.md']), [])
  assert.deepEqual(names(['platform/frontend/projects/flowCenter/project.config.js']), [])
})
