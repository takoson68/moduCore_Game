## [ISSUE-20261016-003]
狀態：Closed（本機驗證完成，尚未部署）

描述：project-b 深層路由初始守衛放行後，Session 還原發現 Token 過期並清除身份，畫面仍停留 `/employee`，顯示個人資料表單。
修正：project-b/layout/LayoutRoot.vue 依既有 route access metadata，在失去登入時返回公開首頁；不修改共享 Router 或 World。
驗證：實際前端＋Worker＋一次性 D1，過期重整及停用重新進入皆返回 `/`；新增 Layout 回歸測試。11 項前端、3 項 API、31 項後端測試通過。詳見 M4_A3_AUTH_E2E_RESULT.md；不代表 Employee API 已完成或線上已修復。

## [ISSUE-20261016-001]
狀態：Closed

描述：盤點 SQL 批次混入遠端 D1 拒絕的 PRAGMA page_count，造成 7500 SQLITE_AUTH，看似整體管理權限異常。
驗證：同一 OAuth 的 SELECT 1、Wrangler 查詢三筆 Migration、users 與 user_tokens 計數皆成功，rows_written=0；page_count 單獨重現錯誤，page_size 成功。容量採清單 file_size／meta.size_after。帳戶數與 Token 數皆為 0。
處置：更正診斷與盤點指令，不擴權、不重登入、不變更資料。Wrangler list 的先前 10000 重測不再出現，原因未定，不將其誤稱已定位的 SQL 問題。帳單／日用量未確認為獨立待確認項，不代表 SQL 權限阻塞仍存在。
影響範圍：M3.1-A 盤點方法；詳見 M3_1_A_DEPLOYMENT_INVENTORY.md 後續診斷更新。

## [ISSUE-20261015-003]
狀態：Closed

描述：M3 PBKDF2-SHA256 600000 次本機可執行，但遠端登入失敗。以不連接 D1、只用合成測試向量的遠端 preview 確認：Web Crypto 與 Node.js crypto 均拋出 NotSupportedError，訊息明確指出上限 100000 次；100000 控制組成功。
修正：新密碼使用 OWASP 基準 scrypt N=16384、r=8、p=5；新增 0003 Migration 擴充格式並保留帳戶與 Token。既有 PBKDF2 編碼不改寫，其他環境若有此類帳戶仍須安全重設。沒有降低 PBKDF2 次數、付費升級或修改 World。
驗證：20 項本機測試通過，包括 Migration 資料保留及失敗回復；遠端 scrypt 登入、Session 還原、到期、撤銷、跨 Tenant 與錯誤帳密全部通過，合成帳戶已清除。已回復 M1 再恢復 scrypt 版本，D1 三筆 Migration 保留、外鍵無錯。CI 增加完整遠端 Auth Gate 與有限就緒等待，避免部署剛完成時讀到舊版 404。
影響範圍：platform/worker/src/credentials.js、migrations/0003_scrypt_credentials.sql、test/credentials.test.js、scripts/smoke-auth-remote.mjs、.github/workflows/deploy-staging.yml。
備註：通過為小流量功能驗證，不代表取得 CPU 百分位或完成負載測試；仍維持 Free Plan。詳細見 M3_RESULT.md。

## [ISSUE-20260302-001]
狀態：Closed

描述：
`flowCenter` 將模組資料入口集中在 project-level `services/flowCenterApi.js`，各模組 `service.js` 直接依賴該共享 wrapper，而不是在模組內自有 `api/` 邊界中解決資料需求。

影響範圍：
- `platform/frontend/projects/flowCenter/services/flowCenterApi.js`
- `platform/frontend/projects/flowCenter/modules/*/service.js`
- 所有後續 flowCenter 模組的 API 對齊工作

目前決策：
已將 `flowCenter` 的業務模組 API 對接回收至各模組自己的 `api/` 邊界，project-level `flowCenterApi.js` 已移除；認證 session 另以 `flowCenterSessionApi.js` 獨立處理。

是否影響 world：No

備註：
此問題直接違反目前已記錄的工程候選哲學：
- `AB-WC-module-data-ownership.md`
- `AA-WC-project-api-boundary-non-pollution.md`

## [ISSUE-20260302-002]
狀態：Closed

描述：
`flowCenter/project.config.js` 仍宣告「目前階段只建立靜態介面，不實作業務邏輯」，但實際上前後端已存在多個 CRUD 與審核流程實作，專案宣告與工程現況不一致。

影響範圍：
- `platform/frontend/projects/flowCenter/project.config.js`
- `platform/frontend/projects/flowCenter/modules/*`
- `platform/backend/src/Controllers/FlowCenter*.php`

目前決策：
已更新 `flowCenter/project.config.js`，使 scenario 與 constraints 反映目前已進入資料對接、角色隔離與流程整合階段。

是否影響 world：No

備註：
此問題會影響後續 AI / 工程人員對專案階段與可修改範圍的判讀。
