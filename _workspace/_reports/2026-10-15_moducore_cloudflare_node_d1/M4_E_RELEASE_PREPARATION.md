# M4-E 發布準備

日期：2026-10-16。結論：本機發布前檢查通過；待明確授權 Commit／Push 與兩站 Staging 發布。本輪沒有遠端 Migration、寫入或部署。

## 1. 已完成

- 新增 `platform/worker/scripts/employee-smoke-contract.mjs`、`smoke-employees-remote.mjs`，補 project-b 線上 Employee 驗收，接在既有 Auth Smoke 之後；Workflow 尚未推送。
- 共用 Smoke 契約已在一次性 D1 通過；後端測試 43／43。前端原 18 項仍為最近一次成功紀錄，合計 61 項，不表示本輪重新執行了前端全部測試。
- project-b、dineCore 最新 real build 均有成功紀錄，兩站 Wrangler dry-run 本輪通過；沒有發布上傳。
- 未提供執行旗標時，遠端驗收程式直接拒絕、不連線；此拒絕路徑已本機檢查。git diff --check 通過。

## 2. 提交白名單（待授權，不自動加入 Git）

| 範圍 | 檔案 |
|---|---|
| CI | `.github/workflows/deploy-staging.yml` |
| 前端指令／測試 | `platform/frontend/package.json`、`scripts/test-project-b-auth.mjs`、`scripts/test-employee-service.mjs` |
| project-b 登入與清理 | `components/PlatformLoginPanel.vue`、`layout/LayoutRoot.vue` |
| Employee 畫面與資料邊界 | project-b `modules/employee/api/employeeApi.js`、`store.js`、`services/employeeService.js`、`components/EmployeeEditor.vue`、`components/EmployeeTable.vue`、`pages/list.vue` |
| Worker | `platform/worker/package.json`、`src/index.js`、`src/employees.js`、`migrations/0004_project_b_employees.sql` |
| 佈建／驗收工具 | Worker `scripts/project-b-provisioning.mjs`、`provision-project-b-admin.mjs`、`local-project-b-auth-e2e.mjs`、`employee-smoke-contract.mjs`、`smoke-employees-remote.mjs` |
| 後端測試 | Worker `test/auth.test.js`、`provisioning.test.js`、`employee-schema.test.js`、`employees.test.js` |

表內前端相對檔名分別以 `platform/frontend/` 或 `platform/frontend/projects/project-b/` 為根。授權後仍須逐檔檢查實際 Diff，不能使用全量 add。

排除：既有 `platform/frontend/.env`、GEMINI.md、AGENTS.md、_ai-context、_VibeCore AI／治理文件與工作報告；它們保留本機，不混入此次工程提交。若要連同文件版本化，需另行指定範圍。當前 HEAD=3aa2f58、world-oop，尚無 M4 提交；未以 fetch／遠端狀態推論 GitHub 最新狀態。

## 3. 兩站影響與授權範圍

`scripts/select-deploy-targets.mjs` 對共用 Worker、前端工具鏈及 Workflow 的修改會選兩站，故此批 Push 不是只發布 project-b：

- project-b-staging／project-b-staging-db：新增 Employee API、畫面、0004。
- dinecore-staging／dinecore-staging-db：更新共用 Worker，亦套用 0004 產生空 Employee 表；API 仍拒絕非 project-b 身份，不會共用 project-b 資料。
- 舊 moducore-staging 舊站舊庫不在矩陣內，不應修改。

兩站獨立 D1、共用 migration 目錄；本輪不改部署分流或搬遷已套用 Migration。0004 只新增表，不重建 users／Token、不 seed 真實資料。發布仍應核對既有資料與 Migration 清單，不使用舊的三庫零帳戶記錄當作當下證據。

## 4. 授權後執行順序

1. 檢查工程 Diff 與敏感值，依白名單提交並 Push world-oop，記錄提交 SHA／Actions Run。
2. CI 先 Build／測試／dry-run，成功才依各目標套 Migration、Deploy、公開 Smoke、Auth／隔離測試。
3. project-b 額外建立 UUID 標記的三個合成帳戶及本人員工，驗證管理 CRUD、主管不升權／不刪除、本人精確關聯／電話、他人拒絕、綁定刪除保護及專案識別。
4. finally 先清本次員工，再清合成帳戶（Token FK 串刪）及其帳號頻率鍵；核對精確標記殘留為零。不刪其他資料。共享 IP 頻率限制仍依既有一天到期，不全量清除。
5. 兩站都通過才宣告線上 Gate；驗收程式只在 project-b 執行，dineCore 仍走現有 Auth／隔離 Smoke。確認舊站未被改動。

遠端 runner 本輪未執行，其網路／清理 finally 行為尚無線上證據；本機已驗證的是共用業務契約，不冒稱完整遠端 runner 通過。任意步驟失敗，CI 維持失敗，不自動當成發版成功。

## 5. 失敗／回復與成本

- 遠端 Migration 失敗：停止該目標後續步驟，先查實際 Migration／外鍵狀態，不重置或刪庫。矩陣另一站可能成功，必須逐站報告。
- Deploy 或 Smoke 失敗：失敗不會自動回復已部署 Worker；先記錄前後版本與資料狀態，再依核准範圍回復受影響目標。部署前取得各站當下版本，不能使用歷史版本當回復基準。
- Worker 回復保留 0004；不撤銷資料表、不修改 0001～0003。清理失敗須停止、只檢查該次 UUID，不能全表刪除。
- ISSUE-20261016-005 的保守歷史刪除限制仍保留，Smoke 會明確記錄 deleted 或 protected，不把拒絕假裝成功刪除。通知維持核准延後。
- 維持 Free 及每月 NT$100 上限，不新增 Worker／D1／付費方案；實際當日用量與帳單尚未查證，發布前須納入確認。

設計偏離檢查：沿用現有 CI 與測試結構，未改 World／Container、未引入框架或新抽象層。本輪只做本機檢查，下一步等待兩站發布及一次性遠端驗收授權。
