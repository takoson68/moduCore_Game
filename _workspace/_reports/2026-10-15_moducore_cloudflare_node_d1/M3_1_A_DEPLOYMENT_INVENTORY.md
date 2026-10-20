# M3.1-A 固定入口與部署盤點

日期：2026-10-16（台灣）。範圍：唯讀盤點與規劃；沒有建立資源、執行 Migration、改 DNS、Commit、Push 或部署。

## 後續診斷更新（2026-10-16，以本段為最新結論）

- D1 管理 SQL 並非整體權限失效：直接 API `SELECT 1` 成功；Wrangler 遠端查詢三筆 Migration、users／user_tokens 計數成功，均 rows_written=0，帳戶數與 Token 數皆為 0。
- 將原批次拆開實測，`PRAGMA page_count` 單獨穩定回傳 400／7500 `not authorized: SQLITE_AUTH`；`PRAGMA page_size` 成功回傳 4096。原先批次失敗可由 page_count 重現，不應要求擴大 D1 管理權限。容量改讀清單 file_size 或成功查詢的 meta.size_after（69632 bytes）。D1 只支援部分 PRAGMA，參考 [官方 SQL 文件](https://developers.cloudflare.com/d1/sql-api/sql-statements/)。
- `wrangler d1 list --json` 重測成功，仍為 1 庫。先前 10000 已無法重現，確切暫時失敗原因未定；不能將其與 page_count 的 SQL 限制混為同一原因，也不能宣稱重新授權修復。
- 本輪未重新登入、擴權、更動 Secret 或資料。成功的唯讀管理查詢不代表已驗證建立／寫入權限，須在授權的下一階段驗證。
- 初次盤點的失敗紀錄在下文保留為歷史證據。M3.1-A 仍待使用者驗收保留方案；帳單／實際日用量尚待確認，M3.1-B～D 未授權也未開始。

## 1. 結論

部署對照與執行清單已完成；資源數量與管理唯讀 SQL 已確認，帳單／實際每日用量尚未確認。M3.1-A 標為待驗收，不標記整個 M3.1 完成。建議下一階段保留舊站舊庫，另建兩個固定入口與資料庫，避免任何搬移或覆蓋；仍需使用者確認及執行授權。

## 2. 已驗證現況

| 項目 | 2026-10-16 唯讀結果 |
|---|---|
| GitHub | `takoson68/moducore_platform`，Public；預設／目前分支皆 `world-oop` |
| 最新部署 CI | [38712004231](https://github.com/takoson68/moducore_platform/actions/runs/38712004231)，success，Commit `73b72bc` |
| Worker 清單 | Cloudflare API 成功列出 1 個：`moducore-staging` |
| 線上版本 | Wrangler 部署紀錄最新為 `2a42b8d1-62ae-4a53-b457-12d0f465c400`，100% |
| D1 清單 | API 成功，total_count=1：`moducore-staging-db`，ID `ca7c6025-e575-4ec1-9b63-780086fa997b`，file_size=69632 bytes（68 KiB） |
| 公開 HTTP | 首頁 200、health 200 且 database=ok；dineCore 匿名 Session 200；project-b Session 403 PROJECT_MISMATCH |
| 新專案資源 | 清單未見 dinecore-staging、project-b-staging 或其專屬 D1；不是已建好入口 |

命令／查詢依據：`gh repo view`、`gh run list`、`wrangler deployments list --json`、Cloudflare `GET /accounts/{id}/workers/scripts`、`GET /accounts/{id}/d1/database?per_page=100&page=1`，及無憑證公開 HTTP。OAuth 值只在記憶體中使用，不存入報告。

### 初次盤點限制與矛盾（部分已由上方診斷釐清）

- `wrangler d1 list --json` 回傳 Authentication error 10000，但直接 D1 清單 API 成功；不可因此推定沒有資料庫。
- `wrangler d1 execute ... --remote` 僅嘗試 SELECT／PRAGMA，仍回傳 7500 `not authorized: SQLITE_AUTH`。未取得當前資料表內容、帳戶數或 Token 數，不假設庫為空；先前三筆 Migration 與合成帳戶清除為 2026-10-15 的歷史證據。
- Workers account-settings 回傳 `default_usage_model=standard`，不足以證明 Free 或 Paid。帳戶 subscriptions API 回傳 403／10000；方案沿用使用者先前 Free 確認，本輪無帳單再驗證。
- 未查得帳戶實際每日 Worker 請求、D1 Rows Read／Written、CPU 百分位及 GitHub 帳單數據。不能由 68 KiB 推論日用量或保證負載。
- 不自動重登入、擴權、建立臨時寫入驗收帳戶或使用失效登入測試來補足盤點。

## 3. 部署對照（新資源全部為建議，未建立）

| 目標 | 前端 VITE_PROJECT／Worker PROJECT_ID | Worker／公開網址 | D1／環境 |
|---|---|---|---|
| 保留既有站 | `dineCore`／`dineCore` | `moducore-staging`；https://moducore-staging.takoson68.workers.dev/ | 現有 moducore-staging-db；Staging |
| dineCore 新固定站 | `dineCore`／`dineCore` | `dinecore-staging`；預定 https://dinecore-staging.takoson68.workers.dev/ | 新 dinecore-staging-db；Staging |
| project-b 新固定站 | `project-b`／`project-b` | `project-b-staging`；預定 https://project-b-staging.takoson68.workers.dev/ | 新 project-b-staging-db；Staging |

新 DB ID 只能於建立後填入，不使用占位值部署；Worker 名稱尚未實際建立驗證。兩新目標 Binding 均為 `DB`，但指向不同 DB ID。各自 Static Assets 與 `/api` 同網域。第一輪不建 Production、不購買網域、不配置 SSO。

**保留方案建議：**不搬資料、不清空舊庫、不改舊網址、不強制導向；兩新庫由既有 Migration 建立，帳戶佈建另依 M4。不得把舊站帳密或 Token 複製進新庫。若使用者希望沿用舊資料或共用同一專案舊庫，需另外調整方案並評估切換，不能直接執行。

舊站保留期內維持可存取，但切換 CI 後不得被新目標的 Job 覆蓋；是否持續發布舊站或將其退役，另行確認。新舊 dineCore 暫存資料不同，不能宣稱自動同步。

## 4. 免費額度與成本

以下為 2026-10-16 查閱官方文件的 Free 方案基準，不是實際剩餘用量：

| 類別 | 官方基準／本次規劃 |
|---|---|
| Worker 數 | 每帳戶 100；現有 1，新增 2 後為 3，尚餘 97 個數量名額 |
| D1 數 | 每帳戶 10；現有 1，新增 2 後為 3，尚餘 7 個數量名額 |
| D1 容量 | 每庫 500 MB、帳戶總計 5 GB；現有清單大小約 68 KiB，不代表未來容量需求 |
| Worker 請求與 CPU | 每日 100000 請求、每請求 10 ms CPU；實際用量未取得，不按專案倍增額度 |
| D1 用量 | 帳戶每日 5000000 rows read、100000 rows written；實際當日剩餘未知 |

基於 Free、不買網域及不啟用付費服務的前提，這兩個新增部署不規劃新增固定訂閱費，合計月預算仍為 NT$100 上限；不能當作帳單保證。超額、資源限額與 CPU 限制可能讓功能不可用，禁止自動升級付費。Production 日後按需要建庫，不能把所有五專案雙環境再加舊庫的 11 庫當成可行 Free 配置。

GitHub 目前是 Public Repository，但本輪未取得帳單與 Actions 實際用量，不據此承諾任何 runner／服務完全無費用。沿用標準 ubuntu-latest，不新增付費 runner、監控或部署服務。

來源：[Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)、[Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)、[D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)、[D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)。

## 5. 必要設定調整（尚未實作）

| 實際落點 | 目前證據 | 下階段最小修改 |
|---|---|---|
| platform/worker/wrangler.jsonc:3、10、13、21 | 單一 Worker／dineCore／共用 dist 路徑／舊 DB | 保留舊設定，增加兩個明確部署目標設定；驗證各自 DB ID 與隔離產物 |
| platform/frontend/scripts/build-cloudflare.mjs:6 | 支援明確 VITE_PROJECT，預設 dineCore | CI 每目標明確傳值，不靠改預設切換；不修改使用者 .env |
| .github/workflows/deploy-staging.yml:18、48、51、86 | 單一 concurrency、建置專案與 smoke URL | 目標獨立 Job／concurrency／工作目錄或產物；固定目標清單，參數核對失敗即停止 |
| platform/worker/scripts/smoke-auth-remote.mjs:11、12、20、85 | 網址、tenant、DB 與跨專案測試硬編碼 | 全部由同一已核對目標取得，不能只換 URL 忘記 DB；對 project-b 也不能以 project-b 自己作為跨專案拒絕案例 |
| platform/worker/scripts/smoke.mjs | 固定服務標記，檢查首頁／SPA／health | 驗證目標頁面身份及 API tenant，不只 HTTP 200 |
| platform/frontend/projects/dineCore/project.config.js:2 | Project ID=dineCore | 保留大小寫，不因 Worker slug 小寫改前端身份 |
| platform/frontend/projects/project-b/project.config.js:3 | Project ID=project-b | 保留；Employee API 尚未移植，不假裝業務驗收完成 |

Secrets 維持 GitHub Secrets／Cloudflare Secrets。現有 GitHub staging Environment 可在確認保護規則適用時沿用；兩目標設定仍須明確綁定，Production 不共用此環境。管理權限只在 CI 使用，不出現在 Vue 或任何後台回應。

## 6. M3.1-B～D 執行清單與停止條件

1. 使用者確認上述「保留舊站舊庫＋新增兩庫」方案並授權建立、發布；Commit／Push 另依明確授權。
2. 先排除 D1 SQL 管理驗證問題，確認方案、當日用量及帳戶額度；不因 Worker health 正常推定 CI／Wrangler 管理權限可用。修正後先執行唯讀 Schema 與 Migration 核對，再做寫入。
3. 建立兩新 D1，記錄真實 ID；空庫套用適用 Migration，禁止包含正式資料或預設密碼。
4. 以固定設定各自建置／部署 Worker、Assets；每個 Job 在核對 Project／DB／URL 一致後才能 Migration、部署與合成帳戶驗收。
5. 同時驗證兩個固定 URL、首頁身份、SPA、health、Session／登入／撤銷及跨專案拒絕；清除各自測試資料。
6. 更新 A 並確認 B 的版本、入口及測試資料不變；測試 A 安全失敗與 Worker 回復，確認不回復 B 或 D1。新目標首次部署若無舊版可回復，先建立已驗證基線，不能拿另一專案版本充當回復目標。
7. 保存 CI／版本／URL／隔離與回復證據，更新規格及 CURRENT_WORK。固定入口與業務 API 移植分別驗收。

任何 DB 權限、額度、目標對應、資料保留或 Gate 無法確認時，停止該寫入／發布；不刪除舊資源解決問題。

## 7. 本輪停止點

盤點文件已產出；M3.1-A 待驗收，M3.1-B～D 未開始。仍需確認保留方案、管理權限／方案與實際用量，並取得新增資源與發布授權。不是管理後台、Employee CRUD 或點餐 API 實作。
