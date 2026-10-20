# M2 靜態盤點結果

日期：2026-10-15。狀態：改為逐批固定來源契約、由新 JavaScript＋D1 測試驗證；Auth 批次見 [M3 契約](../M3_AUTH_CONTRACT.md)。全量業務契約仍待各專案移植補齊。

## 本輪產出

- [API_MATRIX.md](API_MATRIX.md)：121 條宣告的來源、專案、Auth 摘要、資料表候選、風險及移植狀態。
- [routes.json](routes.json)：逐路由 Request 欄位候選、response 呼叫與狀態碼候選、helper 關聯、前端字面引用及原始碼行號證據。
- [TABLE_MIGRATION.md](TABLE_MIGRATION.md)、[tables.json](tables.json)：32 個 SQL 表名的宣告來源、DDL、路由候選及目標 D1；包含歷史版本，不代表線上實際 Schema。
- [fixtures.json](fixtures.json)：10 個以原始碼推導的合成案例，包含正常、驗證失敗、未授權、權限不足與資料不存在。尚未執行，不能視為 Golden Fixtures。

重跑：在 Repository 執行 `node _workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/m2/inventory.mjs`。這只產生本目錄盤點檔案，不操作資料庫。

## 已確認決策

使用者確認舊 MySQL 只有測試資料，可以重建。後續採空白 D1 Migration＋合成 seed，不搬移舊帳戶、密碼、Token 或訂單；這不授權刪除舊資料庫。各專案 Schema 與外鍵仍須保留必要行為。

## 重要差異與風險

1. 路由數不是 121 個互異的 Method＋Path：`Request.php:71` 起會去除尾斜線，4 組尾斜線宣告重複，正規化後為 117 組。GET 的 QR 產生與清理 session 路由仍可能有寫入副作用；移植前應逐項裁決相容性。
2. 回應不統一：`AuthController.php:203` 起使用 success；`EmployeeController.php:45` 起回傳裸陣列／物件；`Core/Response.php:16` 的 ok 包裝為 `{ok,data}`。保留各契約，不預先統一。
3. `EmployeeController.php` 沒有 Auth 呼叫，`NotificationController.php:12` 接受客戶端 member_id 並預設 1；不能因前端有 guard 就宣稱後端已驗證權限。缺少資料的 employee delete 回傳 200 success，不能自行改成 404。
4. `AuthController.php:81` 直接比對資料庫密碼；`:197` 的 session 查詢沒有用 X-Project 限縮 tenant，且未見有效期條件。M3 應修正密碼儲存、Token 有效期及專案隔離，並記錄為明確的安全行為變更，而非照抄缺陷。
5. `FlowCenterRequestContextResolver.php:20` 依 Token、啟用 profile、company 建立情境；`DineCoreStaffApiController.php:2216` 另檢查 tenant 與角色。兩者規則不同。FlowCenter 的 trait alias `requireManagerContext as private requireManager` 已納入盤點，不應誤判為缺失方法。
6. `DineCoreStaffApiController.php:2699` 呼叫 `resolveNextGeneratedTableCodeSequenceForMap`，全 src 未找到方法定義；由 save-draft/save-final 的 helper 關聯可達（API-019、020）。這是來源缺口，實際觸發條件及錯誤回應仍待執行期確認，不能自行補造成功樣本。
7. `public/.htaccess:2` 僅將 api 路徑導向 api.php；`src/routes.php:7` 的 `/health` 宣告不代表公開 `/health` 一定可達。M1 `/api/health` 是新的部署檢查，非舊業務契約的同名替代。
8. MySQL 日期／upsert／鎖／動態 DDL 與檔案寫入依路由列為風險候選；`src/bootstrap.php:7` 與 `src/lib/db.php:29` 的台灣時間規則需保留。地圖 JSON 與 QR 檔案流程須按既定移植規格處理，不能把 Workers 記憶體當持久儲存。

## 尚待完成

- 目前 `php`、`mysql`、`docker` 不在 PATH；舊設定的 `http://moducore_platform.test/api/session` 在沙箱與允許網路後均無法解析，沒有可用舊 PHP 實測基線。
- 依使用者後續確認，不強制建立舊 PHP／MySQL 環境。以來源與前端呼叫固定契約，再於新的 JavaScript＋D1 執行合成契約測試；舊 API 實測輸出只作可選補充，不作開發阻擋條件。
- 逐一人工核對 JSON 型別、必填／預設值、所有成功／錯誤分支、交易邊界與動態 URL；目前候選值不可當成完整 OpenAPI 契約。
- 多版 SQL 需合併 ALTER／執行期 DDL 選定每專案的最終 Schema；32 個表名只是盤點聯集。

本份盤點產生時僅建立研究產物。後續已依新後端優先方向開始 M3 Auth 批次；不宣稱其餘 API 契約已完成，也不補造舊系統實測結果。
