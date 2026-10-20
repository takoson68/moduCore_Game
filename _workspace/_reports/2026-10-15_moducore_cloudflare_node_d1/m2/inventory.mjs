// 依 PHP 原始碼產生靜態盤點；結果不等同執行期契約測試。
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const out = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(out, '../../../..')
const read = p => readFile(path.join(root, p), 'utf8')
const uniq = xs => [...new Set(xs)].sort()
const matches = (text, regex, group = 1) => [...text.matchAll(regex)].map(m => m[group])
const lineAt = (text, index) => text.slice(0, index).split('\n').length
async function files(dir) {
  const result = []
  for (const item of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${item.name}`
    if (item.isDirectory()) result.push(...await files(p))
    else result.push(p)
  }
  return result.sort()
}

const sources = new Map()
const methods = new Map()
for (const file of await files('platform/backend/src')) {
  if (!file.endsWith('.php')) continue
  const text = await read(file)
  sources.set(file, text)
  const owner = path.basename(file, '.php')
  const declarations = [...text.matchAll(/^    (?:public|private|protected) function (\w+)\s*\(/gm)]
  for (let i = 0; i < declarations.length; i++) {
    const m = declarations[i]
    methods.set(`${owner}@${m[1]}`, {
      file, owner, name: m[1], line: lineAt(text, m.index),
      text: text.slice(m.index, declarations[i + 1]?.index ?? text.length),
    })
  }
}

function reachable(owner, name) {
  const seen = new Set()
  const pending = [`${owner}@${name}`]
  const found = []
  const unresolved = []
  while (pending.length) {
    const key = pending.pop()
    if (seen.has(key)) continue
    seen.add(key)
    let method = methods.get(key)
    if (!method) {
      let calledName = key.split('@')[1]
      // 只允許明確出現於目前 Controller 的 FlowCenter trait。
      const controllerText = sources.get(`platform/backend/src/Controllers/${owner}.php`) ?? ''
      for (const alias of controllerText.matchAll(/(\w+)\s+as\s+(?:public\s+|private\s+|protected\s+)?(\w+)\s*;/g)) {
        if (alias[2] === calledName) calledName = alias[1]
      }
      const allowed = ['FlowCenterContextAware', 'FlowCenterEmployeeContextAware', 'FlowCenterManagerContextAware']
      for (const trait of allowed) {
        if (controllerText.includes(trait) || calledName === 'requireFlowCenterContext') {
          method ??= methods.get(`${trait}@${calledName}`)
        }
      }
    }
    if (!method) { unresolved.push(key); continue }
    found.push(method)
    for (const call of matches(method.text, /\$this->(\w+)\s*\(/g)) pending.push(`${method.owner}@${call}`)
    if (method.text.includes('new FlowCenterRequestContextResolver')) {
      pending.push('FlowCenterRequestContextResolver@resolve', 'FlowCenterRequestContextResolver@resolveToken')
    }
  }
  return { found, unresolved: uniq(unresolved) }
}

const routeText = await read('platform/backend/src/routes.php')
const sqlFiles = (await files('platform/backend/sql')).filter(p => p.endsWith('.sql'))
sqlFiles.push(...(await files('platform/backend/api')).filter(p => p.endsWith('.sql')))
const schemas = []
for (const file of sqlFiles) {
  const text = await read(file)
  for (const m of text.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/gi)) {
    const end = text.indexOf(';', m.index)
    const ddl = text.slice(m.index, end < 0 ? undefined : end + 1)
    schemas.push({ table: m[1], file, line: lineAt(text, m.index), ddl })
  }
}
const knownTables = new Set(schemas.map(s => s.table))
const frontendFiles = (await files('platform/frontend/src')).concat(
  ...(await Promise.all(['project-a','project-b','flowCenter','dineCore','modudesk'].map(p => files(`platform/frontend/projects/${p}`))))
).filter(p => /\.(js|vue)$/.test(p) && !/\/(vendors|dist)\//.test(p))
const frontend = await Promise.all(frontendFiles.map(async file => ({ file, text: await read(file) })))
const routes = []
for (const [i, m] of [...routeText.matchAll(/\$router->add\('([^']+)',\s*'([^']+)',\s*'([^'@]+)@([^']+)'\)/g)].entries()) {
  const [, method, route, owner, handler] = m
  const graph = reachable(owner, handler)
  const direct = methods.get(`${owner}@${handler}`)
  if (!direct) throw new Error(`找不到 handler：${owner}@${handler}`)
  const allText = graph.found.map(x => x.text).join('\n')
  const request = {}
  for (const channel of ['body', 'query', 'headers']) {
    request[channel] = uniq(matches(allText, new RegExp(`\\$request->${channel}\\[['"]([^'"]+)['"]\\]`, 'g')))
  }
  const tables = uniq([...knownTables].filter(t => new RegExp(`\\b${t}\\b`).test(allText)))
  const evidence = []
  for (const item of graph.found) {
    item.text.split('\n').forEach((text, n) => {
      if (/\$response->|\$request->|require\w*Context\(|FOR UPDATE|beginTransaction|commit\(|rollBack\(|file_put_contents|mkdir\(|unlink\(|file_get_contents|ON DUPLICATE|DATE_FORMAT|JSON_EXTRACT|NOW\(|CURDATE\(|SHOW |ALTER TABLE|CREATE TABLE/i.test(text)) {
        evidence.push({ file: item.file, line: item.line + n, text: text.trim() })
      }
    })
  }
  const responseCalls = uniq(matches(allText, /\$response->(\w+)\(/g))
  const responseStatusCandidates = uniq(responseCalls.flatMap(call => ({
    ok: [200], unauthorized: [401], forbidden: [403], notFound: [404],
    validation: [422], internal: [500],
  })[call] ?? []).concat(matches(allText, /,\s*(20[0-9]|40[0-9]|422|500|503)\s*\)/g).map(Number))).map(Number)
  const flags = []
  if (/beginTransaction|FOR UPDATE/.test(allText)) flags.push('交易／競爭')
  if (/file_put_contents|mkdir\(|unlink\(/.test(allText)) flags.push('檔案寫入')
  if (/ON DUPLICATE|NOW\(|CURDATE\(|DATE_FORMAT|SHOW |ALTER TABLE|CREATE TABLE|JSON_EXTRACT/.test(allText)) flags.push('MySQL／動態 DDL')
  if (/password\s*=|user_tokens|require\w*Context/.test(allText)) flags.push('Auth／權限')
  const project = route.includes('/dinecore/') ? 'dineCore' : route.includes('/flowcenter/') ? 'flowCenter' : owner === 'AuthController' || owner === 'HealthController' ? '共用' : 'project-b'
  let auth = '未見 handler 呼叫驗證；需人工確認部署外層'
  if (owner === 'AuthController') auth = 'X-Project；登入比對密碼；session/logout 接受 Bearer 或 query token（細節見來源）'
  if (allText.includes('requireStaffContext')) auth = 'requireStaffContext；各方法角色列表與驗證條件見來源證據'
  if (allText.includes('requireFlowCenterContext')) auth = 'FlowCenter Token＋啟用 profile＋company；部分方法另檢查角色／擁有權'
  if (owner === 'DineCoreGuestApiController') auth = '訪客情境／桌號／session 規則依方法，需逐例實測'
  const consumers = frontend.flatMap(x => x.text.split('\n').flatMap((line, n) => line.includes(route) ? [{ file: x.file, line: n + 1 }] : []))
  routes.push({ id: `API-${String(i + 1).padStart(3,'0')}`, method, path: route,
    normalizedPath: route.replace(/\/+$/, '') || '/', project,
    routeSource: { file: 'platform/backend/src/routes.php', line: lineAt(routeText, m.index) },
    handler: `${owner}@${handler}`, handlerSource: { file: direct.file, line: direct.line },
    auth, requestCandidates: request, responseCalls, responseStatusCandidates, tables,
    statusNote: '候選值；所有 json/error 顯式參數、例外與不可達分支仍須實測，不是完備狀態碼清單',
    risk: flags.length ? '高（保守靜態分流）' : '中（待實測）', riskFlags: flags,
    migrationStatus: '尚未移植', contractStatus: '靜態證據完成；精確型別、分支狀態碼與實測樣本待核對',
    consumers, consumerNote: '僅精確字面比對；動態 URL 與 apiBase 組合可能漏列，不能據此判斷未使用',
    reachableMethods: graph.found.map(x => ({ file: x.file, line: x.line, method: x.name })),
    unresolvedCalls: graph.unresolved, evidence,
  })
}

const tableNames = uniq([...knownTables, ...routes.flatMap(r => r.tables)])
const tableMap = tableNames.map(table => ({
  table,
  declarations: schemas.filter(s => s.table === table),
  routes: routes.filter(r => r.tables.includes(table)).map(r => r.id),
  target: table.startsWith('dinecore_') || table === 'site_visit_daily' ? 'dineCore 專屬 D1' : table.startsWith('flowcenter_') ? 'flowCenter 專屬 D1' : table.startsWith('project_b_') ? 'project-b 專屬 D1' : '共用資料待依專案切分，保留關聯',
  migrationStatus: '待選定 Schema 基線及轉寫 SQLite；未匯入舊資料',
}))
const counts = Object.fromEntries(uniq(routes.map(r => r.project)).map(p => [p,routes.filter(r => r.project === p).length]))
const normalizedCount = new Set(routes.map(r => `${r.method} ${r.normalizedPath}`)).size
await writeFile(path.join(out,'routes.json'), JSON.stringify({ kind:'static-source-inventory', counts, routeDeclarations:routes.length, normalizedMethodPaths:normalizedCount, routes },null,2)+'\n')
await writeFile(path.join(out,'tables.json'), JSON.stringify(tableMap,null,2)+'\n')
await writeFile(path.join(out,'TABLE_MIGRATION.md'), `# 資料表與 Migration 對照\n\n使用者已確認只有測試資料，可重建。以下 ${tableMap.length} 個表名是所有 SQL（含歷史備份）的聯集，並非已確認現行資料庫存在表；多份宣告代表需比對版本。完整 DDL 與來源行號見 tables.json。\n\n採空白 D1 Migration＋乾淨 seed；不匯入舊密碼、Token 或真實個資。SQLite Migration 在 M3 及各 Project 階段撰寫，目前尚未執行業務 Schema。\n\n| 表 | 建議目標 | SQL 來源 | 關聯路由數（靜態候選） |\n|---|---|---|---|\n${tableMap.map(t=>`| ${t.table} | ${t.target} | ${t.declarations.map(d=>d.file+':'+d.line).join('<br>')} | ${t.routes.length} |`).join('\n')}\n`)
const cell = s => String(s).replaceAll('|','\\|').replaceAll('\n',' ')
const rows = routes.map(r => [r.id,`${r.method} ${r.path}`,r.project,`${r.handlerSource.file}:${r.handlerSource.line}`,r.auth,r.riskFlags.join('、') || '一般查詢／CRUD，待實測',r.tables.join(', ') || '靜態未辨識',r.migrationStatus].map(cell).join(' | '))
await writeFile(path.join(out,'API_MATRIX.md'), `# M2 API 路由矩陣\n\n來源：platform/backend/src/routes.php。共 ${routes.length} 條宣告，正規化尾斜線後為 ${normalizedCount} 組 Method＋Path。\n\n這是靜態盤點，非已驗證的完整契約。Request 候選欄位、response 呼叫、遞迴 helper 與原始證據見 routes.json；共同 helper 會帶入分支候選，不代表每條路徑都可達。所有路由仍待舊 PHP 執行期回歸，不能標示 M2 Gate 完成。\n\n| ID | Method／Path | 專案 | Handler 來源 | Auth 證據摘要 | 風險候選 | 資料表候選 | 移植狀態 |\n|---|---|---|---|---|---|---|---|\n${rows.map(r=>'| '+r+' |').join('\n')}\n`)
console.log(JSON.stringify({counts, declarations:routes.length, normalized:normalizedCount, tables:tableMap.length, unresolved:routes.filter(r=>r.unresolvedCalls.length).map(r=>({id:r.id,calls:r.unresolvedCalls}))},null,2))
