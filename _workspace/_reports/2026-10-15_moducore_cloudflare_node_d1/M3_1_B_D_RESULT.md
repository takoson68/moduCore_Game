# 多專案固定入口部署結果

2026-10-16：M3.1 固定入口、獨立部署、資料隔離及 CI Gate 已通過。工程 Commit `3aa2f58` 已推送 world-oop；[CI 38856141952](https://github.com/takoson68/moducore_platform/actions/runs/38856141952) 兩目標全數成功。安全失敗演練 [38856271678](https://github.com/takoson68/moducore_platform/actions/runs/38856271678) 按預期在遠端操作前停止；該紅色結果是刻意測試，不是線上故障。帳單與負載驗證限制仍保留。

## 固定入口

| 專案 | 網址 | 專屬 D1 | 目前 Worker 版本 |
|---|---|---|---|
| dineCore | https://dinecore-staging.takoson68.workers.dev/ | dinecore-staging-db | cf5ee141-9ed6-422d-8b08-7ba7128be32d |
| project-b | https://project-b-staging.takoson68.workers.dev/ | project-b-staging-db | cd48490c-e0db-4f3c-a4b9-ccb70cd91eef |
| 舊 dineCore 測試站，保持原樣 | https://moducore-staging.takoson68.workers.dev/ | moducore-staging-db | 2a42b8d1-62ae-4a53-b457-12d0f465c400 |

新 D1 ID：dineCore `10230112-5e9d-4ed7-ad17-d836896e64b1`；project-b `d446407c-6c4b-4746-b0fb-7368d850986c`。皆於 APAC 建立，已各自套用 0001～0003 Migration，沒有搬移／清空舊資料。

## 驗證

- 兩 Project real 模式建置，分別輸出至 Worker `.assets/dinecore-staging`、`.assets/project-b-staging`，不覆寫共享 dist。
- 23 項後端測試、3 項前端 API 傳輸測試、兩組 dry-run、Workflow YAML 語法通過；包含按專案選擇 CI 目標。
- 兩站首頁／SPA／health、登入／Session／還原／到期／登出、錯誤帳密及 Query Token 拒絕通過。
- 使用對方正確 Project Header 跨網址送 Token，仍為未登入；對方 D1 無本次合成帳戶。不是僅測 Header 不符。
- 手動演練時，dineCore 從 a72871b0-22b2-4f84-b419-fb13760c6f31 更新至 c03622b6-e162-4b27-899c-51e59e8d22c6，再回復 a72871b0；project-b 當時版本 fe975fd2-3720-4f82-ac4c-b58e56869af2 及合成帳戶全欄位、舊站版本及資料快照均未改變。之後由 CI 發布為上表新版本。演練腳本 `platform/worker/scripts/smoke-isolation-rollback.mjs`，僅在明確授權下手動執行，不加入每次 CI。
- 最終三庫 users／user_tokens 皆為 0、外鍵檢查無錯、三筆 Migration 均存在；已清除本輪合成資料。
- 安全失敗演練：兩 Job 的 Simulate safe staging failure 皆按預期失敗，Apply D1 migrations、Deploy Worker and Static Assets 皆 skipped。以三站部署版本＋三庫帳戶／Token 數、Migration 名稱與 FK 檢查結果比對前後完全一致，沒有覆蓋最後可用版本。這不是 D1 資料復原演練。
- 瀏覽器已確認兩站各自顯示「桌邊點餐」及「Project B」。

## 工程變更及操作

- `platform/worker/wrangler.dinecore-staging.json`、`wrangler.project-b-staging.json`：固定 Worker／Project／服務標記／D1／隔離靜態檔目錄；舊 wrangler.jsonc 未修改。
- `scripts/deployment-targets.mjs`：只接受明確 Staging 白名單，核對設定與 DB ID，未知或不一致即停止。
- `scripts/smoke*.mjs`：由目標取得 URL／Project／DB，不接受任意外部目標；`VERIFY_PEER_ISOLATION=1` 可驗證另一新站 Token 與 DB 隔離。
- `src/index.js`：health 使用設定的 SERVICE_NAME；舊設定無此欄位時保持原標記。World／Container／Module 未改動。
- `.github/workflows/deploy-staging.yml`：兩個獨立 matrix Job、concurrency、real 模式及隔離產物，各自 Migration／部署／Smoke。新增 select-deploy-targets.mjs：專案私有變更只選自身，共用前端／Worker／Workflow 變更選兩站，文件不部署；手動派送選兩站。選擇規則已單元測試，本輪共用工程變更已實際由 CI 發布兩站；未另外製造單專案 Commit 做線上演練。不再發布舊站。

手動重建時，在 frontend 目錄執行 `VITE_PROJECT=dineCore VITE_API_MODE=real npm run build:cloudflare -- --outDir ../worker/.assets/dinecore-staging`；project-b 以其 Project／目標名稱替換。再於 worker 使用 `--config wrangler.<target>.json` 執行 check、migration、deploy。必須先測試和 check，再部署；不可省略 config，否則可能使用保留的舊站設定。

## 限制與下一步

- 兩目標 CI 與安全失敗演練均已驗收。下一階段是 M4 project-b 帳戶佈建與 Employee 垂直切片，本輪不開始。
- 不提供預設帳密；project-b Employee 與 dineCore 業務 API 未移植。dineCore 首頁目前會顯示無法建立點餐身份，屬未移植 API 限制，不是已可營運。
- 未變更付費方案、購買網域或啟用額外付費服務；合計現有 3 Worker／3 D1。方案採使用者確認的 Free 前提，當日額度／實際帳單與負載數據仍未取得，不能承諾任意流量成本。
- 本輪工程已提交 3aa2f58；既有 AI 文件及 frontend/.env 未納入。報告與工作紀錄仍在本機。
