# moduCore Cloudflare 部署分析摘要

2026-10-16 最新分析：[前端 ZIP 版本管理里程碑建議](FRONTEND_RELEASE_MILESTONE_PROPOSAL.md)。建議 M4 後先加入 M4.1 成品封存／本機驗收，M8-A 加唯讀版本列表，M9 才做發布／回復／安全上傳；尚未實作或授權新資源。M4 已發布且持久測試管理員已可登入，下方未建立帳戶等描述為歷史紀錄。

最新：[M4-A2 佈建工具](M4_A2_PROVISIONING_RESULT.md)已本機驗證，後端 31 項測試及 TTY 不回顯通過；預設只用一次性本機 DB，沒有建立真實／遠端帳戶、提交或部署。M4-A3 前端整合 Gate 尚未執行。

2026-10-16 最新：[M4-A 登入與帳戶佈建契約](M4_A_AUTH_PROVISIONING_CONTRACT.md)來源核對已完成；面板修正、佈建工具與前端登入 Gate 尚未實作，沒有建立真實帳戶或部署。

後續：[M4-A1 面板修正](M4_A1_LOGIN_PANEL_RESULT.md)已在本機完成，10 項邏輯測試、3 項 API 測試及 real build 通過；未提交或部署。下一步為 M4-A2 受控帳戶佈建工具，不等同整個 M4-A 已完成。

日期：2026-10-15  
階段：M3 JavaScript 後端 Auth 基礎  
狀態：M1 已驗收；M2 逐批固定來源契約；M3／G2 已通過遠端登入、CI 與 Worker 回復驗收；M4 尚未開始

測試站目前已切換 dineCore，見 [Staging 切換結果](STAGING_DINECORE_RESULT.md)；此為畫面與 tenant 設定切換，非業務 API 移植完成。

2026-10-16：[M3.1-B～D 部署結果](M3_1_B_D_RESULT.md)已驗收。[dineCore 固定站](https://dinecore-staging.takoson68.workers.dev/) 與 [project-b 固定站](https://project-b-staging.takoson68.workers.dev/) 各自 D1，舊站保留；Commit 3aa2f58、多目標自動部署 CI 38856141952 成功，安全失敗演練 38856271678 符合預期。業務 API 尚未移植。

已確認新增需求：各專案使用固定網址／子網域、獨立 Worker 與必要 D1，同一 Repository 共用基礎。先做 M3.1 多專案入口與 CI 隔離，再於 M8-A 建立唯讀專案管理後台；後台建立資源或一鍵部署列為 M9 候選，需另行確認。詳細見規格第 5、9、11、13 章。本次僅更新文件，尚未建立新資源。

最新結果：[M1 驗收](M1_RESULT.md)、[M2 盤點](m2/README.md)、[M3 簡短結果](M3_RESULT.md)、[新後端 Auth 契約](M3_AUTH_CONTRACT.md)。以下原始架構分析與建置結果保留為研究時點紀錄。

2026-10-16：[M3.1-A 固定入口盤點](M3_1_A_DEPLOYMENT_INVENTORY.md)已產出、待驗收。帳戶清單確認 1 Worker／1 D1；建議保留舊站舊庫，新增 dineCore、project-b 各自入口與新庫，合計將為 3 Worker／3 D1。後續已確認一般管理 SQL 正常，錯誤源於 page_count；帳單與當日用量仍待確認。尚未建立新資源。

## 結論

moduCore 前端架構可以保留，Vue 專案可部署到 Cloudflare Static Assets。現有 PHP／MySQL 後端無法直接在 Cloudflare Workers 執行，應完整替換成 JavaScript Worker，資料庫改為 Cloudflare D1／SQLite。

- 保留 World、Container、模組註冊、Store、Router 與 UI Slot。
- 每個 moduCore 專案建議獨立部署為一個 Worker。
- 每個需要持久化資料的專案使用獨立 D1。
- 前端與 API 維持同網域，API 沿用相對 `/api` 路徑。
- 不預先導入 Express、Hono、ORM、Repository 或微服務。
- MySQL SQL、交易、驗證及檔案寫入功能必須重寫。

## 驗證結果

已在暫存目錄完成下列前端建置驗證，未修改專案原始碼：

- project-a：成功
- project-b：成功
- dineCore：成功
- flowCenter：成功
- modudesk：成功

現有後端共盤點 121 條 API 路由：

- 共用登入與健康檢查：5 條
- project-b：20 條
- flowCenter：23 條
- dineCore：73 條

## 主要風險

- 現有登入使用不安全的密碼直接比對方式。
- Token 可經由 URL Query 傳遞，可能進入瀏覽器紀錄或伺服器日誌。
- MySQL 的 `FOR UPDATE`、`ON DUPLICATE KEY`、日期函數與 DDL 無法直接用於 D1。
- dineCore 會在執行期間寫入地圖 JSON 與 QR 圖檔，但 Workers Static Assets 不可於執行期間修改。
- 原分析時沒有正式自動化測試、Wrangler 設定或 GitHub Actions；M1 現已補齊部署基線，業務契約回歸仍待 M2 完成。
- 部分文件描述與實際程式仍有落差，例如空的生命週期階段、跨模組 import 與 metadata 遺失。

## 成本與限制

- 第一階段採 Cloudflare Free Plan，才能維持每月 NT$100 內的預算。
- Workers Free 每日 100,000 次 Worker 請求；Static Assets 請求不計入 Worker Requests。
- D1 Free 每日 5,000,000 Rows Read、100,000 Rows Written，最多 10 個資料庫、總容量 5 GB。
- 五個專案若都建立 Production 與 Staging D1，可能剛好用滿 10 個免費資料庫。
- Workers Paid 最低約 US$5／月，超出目前預算上限。

## 建議執行順序

1. 先建立 Cloudflare Free Plan 環境，確認 GitHub Push 可自動部署空殼 Worker。
2. 驗證 Static Assets、SPA fallback、`/api/health` 與測試 D1 binding。
3. 固定既有 API 契約並建立測試樣本。
4. 建立原生 JavaScript Router、Auth 與 D1 基礎。
5. 將 MySQL Migration 改寫為 SQLite Migration。
6. 先移植 project-b，再處理 flowCenter 與 dineCore。

## 里程碑摘要

最新 M4-E 已發布：提交 86810ff、CI 38863036522 兩站與 Employee 驗收成功，合成資料清除，見 [發布結果](M4_E_DEPLOYMENT_RESULT.md)。尚未建立真實管理員，下一步確認安全開通方式。

最新 M4-E：發布準備與 Employee Smoke 已補齊，本機後端 43 項通過、兩站 dry-run 通過；未推送部署。共用修改會發布兩站，需另行授權，見 [發布準備](M4_E_RELEASE_PREPARATION.md)。

最新 M4-D2：本機主管／本人／錯誤恢復／換帳號驗收通過，60 項測試通過，見 [角色驗收結果](M4_D2_ROLE_RESULT.md)。下一步發布準備；未推送部署、G3 未通過。

最新 M4-D：員工畫面核心串接及管理員本機 CRUD 通過，60 項自動測試通過；主管／本人完整 UI Gate 待補，未部署。見 [畫面整合結果](M4_D_FRONTEND_RESULT.md)。

最新 M4-C：Employee API 本機完成、後端 42／42 測試通過；畫面尚待 M4-D，未部署。見 [API 結果](M4_C_CRUD_RESULT.md)。歷史刪除採保守限制，未宣稱精確引用判定完成。

最新 M4-B：使用者選 A，員工資料表與本機約束測試完成，後端 35／35 通過。未發布、未實作 CRUD，見 [資料表結果](M4_B_SCHEMA_RESULT.md)。下方 B0 待選方案為歷史記錄。

M4-B0：完成 [員工資料執行草案](M4_B_EMPLOYEE_SPEC.md)，先確認「員工與登入帳戶分開」或「建立員工同時開通帳戶」。尚未建表；M4-B 為 Schema，M4-C 才是 CRUD。

最新：M4-A3 本機登入整合驗收通過，含過期／停用與登出；11 項前端、3 項 API、31 項後端測試通過。尚未提交／部署或建立真實帳戶，Employee CRUD 仍待 M4-B，見 [本機整合結果](M4_A3_AUTH_E2E_RESULT.md)。

| 階段 | 里程碑 | Gate |
|---|---|---|
| A 環境基線 | M0 帳號權限、M1 部署鏈路 | G1 環境就緒 |
| B 契約與核心 | M2 API 真相包、M3 Worker／Auth／D1 | G2 Pilot Ready |
| B 多專案入口 | M3.1 固定網址、獨立部署／資料與 CI | 至少兩專案同時在線、更新互不覆蓋 |
| C Pilot | M4 project-b 垂直切片 | G3 Pilot 完成 |
| D 專案移植 | M5 flowCenter、M6 dineCore、M7 modudesk | G4 後端替換 |
| E 正式化 | M8 Production 收斂、M8-A 唯讀專案管理後台 | G5 Release Ready |
| F 未來候選 | M9 後台部署／資源控制 | 另行確認，不屬當前實作 |

每個里程碑都必須有前置條件、任務、交付物、完成證據及禁止跨越條件。完整 Gate 請見執行規格書第 13 章。

完整內容請參考 [EXECUTION_SPEC.md](./EXECUTION_SPEC.md)。
