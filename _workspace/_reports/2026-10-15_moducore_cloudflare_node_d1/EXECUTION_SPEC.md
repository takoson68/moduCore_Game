# moduCore Cloudflare Node／D1 執行規格書

日期：2026-10-15  
文件性質：分階段執行規格  
實作狀態：M1、M3／G2 已驗收；多專案固定入口及管理後台尚未實作，以第 13 章看板為準。

## 1. 目標

建立以下部署流程：

```text
本機開發與驗證
  → Git Commit／Push
  → GitHub Actions
  → 前端建置與測試
  → D1 Migration
  → Worker + Static Assets 部署
  → Smoke Test
  → 分享正式網址
```

目標執行環境：

- 前端：Vue 3、Vue Router、Vite
- 靜態資源：Cloudflare Static Assets
- API：Cloudflare Workers、JavaScript ES6+
- 資料庫：Cloudflare D1／SQLite
- CI/CD：GitHub Actions、Wrangler
- 部署單位：每個 moduCore 專案一個 Worker

## 2. 範圍原則

### 2.1 保留項目

- World 與啟動流程概念
- Container 與能力註冊方式
- 專案與模組目錄概念
- Vue 元件、Layout、Router 與 Store
- UI Slot 與模組路由描述
- 相對 `/api` 的同網域呼叫方式

主要程式依據：

- `platform/frontend/src/main.js`
- `platform/frontend/src/world.js`
- `platform/frontend/src/app/boot/boot.js`
- `platform/frontend/projects/moduleRuntime.js`
- `platform/frontend/src/app/api/index.js`

### 2.2 必須替換項目

- PHP API 入口、Router 與 Controller
- PDO MySQL 資料存取
- MySQL Schema、Migration 與 Query
- PHP Session／Token 實作
- 執行期間的 JSON、QR Code 檔案寫入
- PHP public 目錄部署流程

### 2.3 第一階段不做

- 不重寫 moduCore 核心
- 不拆分微服務
- 不導入新的前端狀態管理框架
- 不預先建立通用 ORM、Repository 或 Service Layer
- 不支援 PHP Runtime
- 不為了 D1 宣稱 SQL 可完全跨資料庫

## 3. 現況分析

### 3.1 前端啟動流程

目前流程為：

1. 由 `VITE_PROJECT` 選擇專案。
2. 載入 Project Config。
3. 建立並啟動 World。
4. 註冊核心 Store 與模組。
5. 建立 Router。
6. 掛載 Vue App。

此設計可以保留，並適合在 CI 中針對不同專案分別建置。

### 3.2 前端建置結果

已在暫存目錄驗證五個專案均能成功執行 Vite production build：

| 專案 | 建置結果 | 約略輸出大小 |
|---|---:|---:|
| project-a | 成功 | 1.5 MB |
| project-b | 成功 | 2.3 MB |
| dineCore | 成功 | 1.8 MB |
| flowCenter | 成功 | 1.5 MB |
| modudesk | 成功 | 1.5 MB |

目前 Vue Router 使用 History Mode，因此 Cloudflare 必須提供 SPA fallback。

### 3.3 後端現況

現有後端是 PHP 8、自製 Router、Controller 與 PDO MySQL：

- API 路由總數：121
- PHP Controller：17 個
- Controller 程式：約 9,116 行
- dineCore 為最大移植範圍

主要程式依據：

- `platform/backend/public/api.php`
- `platform/backend/public/router.php`
- `platform/backend/src/routes.php`
- `platform/backend/src/lib/db.php`
- `platform/backend/src/Controllers/`
- `platform/backend/sql/`

PHP 無法在 Workers Runtime 執行，因此不是相容性調整，而是完整後端替換。

## 4. 目標架構

```text
使用者
   │
   ▼
專案專屬 Cloudflare Worker
   ├── /api/*       → JavaScript API Router
   ├── 靜態資源     → Static Assets
   └── 前端其他路徑 → index.html SPA fallback
                         │
                         ▼
                    專案專屬 D1
```

Worker 採原生入口：

```js
export default {
  async fetch(request, env, ctx) {
    // API routing
  },
}
```

不預設使用 Express 或 Hono。只有在原生路由已證明無法有效維護時，才另外提出框架評估。

## 5. 多專案部署規格

### 5.1 固定入口與部署隔離

2026-10-16 進度：M3.1 已驗收。dinecore-staging、project-b-staging 及各自 D1 已建立，多目標 CI／遠端 Auth／隔離／回復與安全失敗測試通過，舊站保留。Commit 3aa2f58、CI 38856141952 成功，38856271678 刻意失敗測試符合預期。證據見 [M3.1 部署結果](M3_1_B_D_RESULT.md)。

2026-10-15 使用者確認：每個專案應有固定且可同時使用的入口網址或子網域，不再靠替換同一個測試站的 `VITE_PROJECT` 展示不同專案。

每個專案獨立部署，避免在同一個 Worker 中動態切換 Tenant：

| 專案 | Worker | D1 建議 |
|---|---|---|
| project-a | 獨立 Worker | 視資料需求建立 |
| project-b | 獨立 Worker | `project-b-db` |
| dineCore | 獨立 Worker | `dinecore-db` |
| flowCenter | 獨立 Worker | `flowcenter-db` |
| modudesk | 獨立 Worker | 待確認共享需求 |

此方式符合目前一次只建置一個 `VITE_PROJECT` 的設計，也避免跨專案資料關聯。

Cloudflare 設定必須包含：

- Static Assets Directory
- SPA `not_found_handling`
- `/api/*` 使用 `run_worker_first`
- 專案專屬 D1 Binding
- Staging 與 Production 分離

### 5.2 網址、專案與環境對應

同一 Repository 共用 moduCore 基礎，每個部署固定一個 Project 與環境；不複製整份 Repository、不在前端 runtime 切換 World。

| 專案 | Staging Worker／預定網址 | 固定 Project ID |
|---|---|---|
| dineCore | `dinecore-staging`／`https://dinecore-staging.takoson68.workers.dev` | `dineCore` |
| project-b | `project-b-staging`／`https://project-b-staging.takoson68.workers.dev` | `project-b` |
| flowCenter | `flowcenter-staging`／`https://flowcenter-staging.takoson68.workers.dev` | `flowCenter` |

上述 dineCore、project-b Staging 已建立並確認可用；flowCenter 仍為規劃。Worker 名稱採小寫，不代表必須改名既有 `dineCore`／`flowCenter` Project ID。後續專案沿用 `<project-slug>-staging`／`<project-slug>-prod`，網域以實際資源回傳為準。

- 優先使用 `workers.dev`，不以購買網域作為第一階段前置條件。網址形式依 [Cloudflare workers.dev 文件](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)。
- 自有網域可於 M8 綁定，例如 `dine.example.com`；須先確認網域所有權、DNS、HTTPS、成本與環境，不預設使用者已持有。
- 同一專案的頁面與 `/api` 維持同網域；不同專案的帳號、Token、瀏覽器儲存及資料不因共用程式而自動互通，不新增跨專案 SSO。
- 每個目標有固定的 `VITE_PROJECT`、Worker `PROJECT_ID`、Worker 名稱、D1 Binding／資料庫、環境與公開 URL。`X-Project` 必須與伺服器固定設定相符，不能由瀏覽器任意選庫或切換專案。
- 純靜態專案可不建 D1；需要持久化資料時各自建庫。Staging 與 Production 不共用資料庫，不為湊免費額度混用身份或業務資料。

### 5.3 現有測試站的過渡安排

M1 舊資源為 `moducore-staging`／`moducore-staging-db`，網址 `https://moducore-staging.takoson68.workers.dev/`，展示 dineCore。2026-10-16 新增兩站後仍保持舊資源不變；新設定為 platform/worker/wrangler.dinecore-staging.json、wrangler.project-b-staging.json。新版 Workflow 與目標化 Smoke 已推送並通過兩站 CI，不再更新舊站；舊站是否退役另行確認。

M3.1 實作時先盤點與決定既有 D1 的保留／新建方式，不自動刪除、重新命名、清空或搬移資料。先建立並驗收各專案新入口，再決定舊網址保留或導向；未經確認不將現有網址改指另一專案。新入口建立後，更新某專案不得覆蓋其他專案既有網址。

### 5.4 專案管理後台的分段範圍

此為部署管理介面，不等同 dineCore 店務後台或 Employee CRUD；不因此重寫 moduCore 核心。

1. M3.1 先用受版本管理的部署設定與 GitHub Actions 建立固定入口，不做自動建站後台。
2. M8-A 再提供受管理員權限保護的專案清單：名稱、Project ID、環境、網址、部署狀態、最後成功版本／CI 連結。未知或過期狀態明確標示，不把列表設定當成即時部署成功證據。資料先取自既有部署設定及發布紀錄，不預設新增管理資料庫或通用抽象。
3. 未來 M9 候選才處理後台觸發部署、建立 Worker／D1、綁定網域等控制操作。需另外確認需求與授權、權限範圍、審計、失敗回復及成本，不能把本次規格確認視為建立資源或改 DNS 的授權。

Cloudflare 管理憑證只在受信任的 CI／伺服器端使用，不進 Vue bundle、瀏覽器儲存、後台回應或 Git。後台登入不等於取得所有專案資料存取權，不能只靠前端隱藏按鈕保護控制操作。

## 6. Worker API 規格

每次 API 請求依序執行：

1. 解析 URL 與 HTTP Method。
2. 比對明確的 Route Table。
3. 驗證 Content-Type 與輸入資料。
4. 執行登入、權限與 Tenant 驗證。
5. 呼叫該模組的 Query／Domain Function。
6. 執行 D1 操作。
7. 回傳統一 JSON Response。
8. 記錄 Trace ID 與結構化錯誤日誌。

建議回應格式：

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "traceId": "..."
}
```

錯誤回應不得包含 SQL、Stack Trace、檔案路徑或內部例外原文。

## 7. D1／SQLite 改寫規格

### 7.1 Schema 轉換

| MySQL | SQLite／D1 |
|---|---|
| `AUTO_INCREMENT` | `INTEGER PRIMARY KEY` |
| `ENUM` | `TEXT CHECK (...)` |
| `TINYINT`／`BOOLEAN` | `INTEGER CHECK (value IN (0,1))` |
| `INSERT IGNORE` | `INSERT OR IGNORE` |
| `ON DUPLICATE KEY` | `ON CONFLICT` |
| Inline `KEY` | 獨立 `CREATE INDEX` |
| MySQL 日期函數 | SQLite 日期函數 |
| `ON UPDATE CURRENT_TIMESTAMP` | 應用程式更新或 Trigger |

其他要求：

- 金額使用整數最小貨幣單位，避免浮點誤差。
- JSON 欄位使用 `TEXT`，必要時加入 JSON Validity Check。
- 所有 Foreign Key、Unique Constraint 與 Index 必須在 Migration 中明確定義。
- 正式 Migration 不可混入測試 Seed。

### 7.2 交易

現有固定 SQL 組合可改用 D1 `batch()`。具有條件判斷、庫存競爭或 `FOR UPDATE` 的流程，必須重新設計為：

- Conditional Update
- Unique Constraint
- Idempotency Key
- 狀態機檢查
- 必要時以單一 SQL 完成原子更新

不可只移除 `FOR UPDATE` 後繼續使用原流程。

## 8. 驗證與安全規格

現有密碼直接查詢比對與 Query String Token 必須移除。

最低要求：

- 密碼只保存安全雜湊。
- Token 資料保存雜湊、到期時間、撤銷時間與 Tenant。
- 第一版可使用 `Authorization: Bearer` 以降低前端修改量。
- URL Query 不得傳遞登入 Token。
- 不得只信任前端送出的 `X-Project`。
- Worker 必須固定綁定一個專案／Tenant。
- 登入、登出、Session、權限失敗應有一致狀態碼。
- Production Secrets 只能放 Cloudflare Secrets／GitHub Secrets。

HttpOnly Cookie 安全性較佳，但會改變前端登入契約，列為實作前決策項目。

## 9. 成本與限制

2026-10-16 新增提案：前端 ZIP 封存納入 GitHub Artifact 用量，不能當成永久免費備份；先量 ZIP 容量、建置頻率及帳戶剩餘額度，再確認短期保留期，不自動新增 R2 或付費方案。詳見 FRONTEND_RELEASE_MILESTONE_PROPOSAL.md；以下 Cloudflare 原有成本限制保留。

依 2026-10-15 Cloudflare 官方方案：

- Workers Free：每日 100,000 次 Worker 請求。
- Static Assets 請求免費且不計入 Worker Requests。
- D1 Free：每日 5,000,000 Rows Read、100,000 Rows Written。
- D1 Free：總容量 5 GB、最多 10 個資料庫、每個 500 MB。
- Workers Paid 最低約 US$5／月，超過 NT$100 預算。

因此第一階段採 Free Plan。若每個專案都建立 Production 與 Staging D1，五個專案可能剛好用滿 10 個免費資料庫，需按實際資料需求建立。

多專案成本規則：

- 帳戶層額度不能乘以專案數；Workers 請求額度依帳戶合計，D1 帳戶總額度、資料庫數與每庫限制分別盤點，參見 [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) 與 [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)。
- 現有 `moducore-staging-db` 也占資料庫名額；若保留再建立五組 Staging／Production，不是剛好 10 個，而可能超過限制。建立前須列出實際已用數量及預留容量，不自動為所有專案建雙環境。
- 一起評估 GitHub Actions 使用量、建置與 API CPU／資料庫消耗；獨立網址不代表資源無上限或每專案都有一份免費額度。
- 每月 NT$100 為全部專案合計預算；自有網域購買／續約與其他外部服務另外列項並計入，不自行訂閱、購買或升級付費方案。
- 超限時先停止新增資源、說明影響並討論調整；不得自動共用跨專案資料庫或建立其他帳戶規避限制。

## 10. 檔案功能改寫

Workers 執行期間不能修改 Static Assets，因此：

- 地圖 JSON 改存 D1。
- 建議欄位包含 `map_id`、`status`、`payload_json`、`version`、時間欄位。
- QR Code 改為請求時動態產生並回傳 SVG 或 PNG。
- 不再將 QR Code 寫入 `public/assets`。
- 第一階段不導入 R2；確認需要永久檔案儲存後再評估。

## 11. CI/CD 規格

M4.1 提案（未實作）：在遠端 Migration／Deploy 前加入同次建置的 ZIP／manifest／checksum 封存，封存失敗則停止；部署後另存發布回執，不把已封存視為已發布。具體 Gate 見 FRONTEND_RELEASE_MILESTONE_PROPOSAL.md，未經確認不改既有 Workflow。

GitHub Actions 建議流程：

1. Checkout。
2. `npm ci`。
3. 靜態檢查與自動化測試。
4. 使用指定 `VITE_PROJECT` 與 `VITE_API_MODE=real` 建置。
5. 套用 Staging D1 Migration。
6. 部署 Staging Worker Version。
7. 執行登入、CRUD、深層路由 Smoke Test。
8. 經 GitHub Environment 核准。
9. 套用 Production Migration。
10. 部署 Production。
11. 執行 Production Smoke Test。

Migration 及部署任一階段失敗時，後續步驟必須停止。

多專案 CI/CD 補充（M3.1）：

- 預設及部署來源分支為 `world-oop`；使用固定目標清單／獨立設定選擇 Project，不以每次手動改同一個預設值發布。
- 每個 Job 以目標專案獨立工作目錄或隔離產物建置，防止共享 `dist` 被另一專案覆寫；發布前核對前端 Project、Worker PROJECT_ID、D1 與 URL 一致。
- 各目標有獨立 concurrency key、Migration、Secrets／環境、版本紀錄與 Smoke。不能將 dineCore 的合成帳戶寫進 project-b 資料庫。
- 專案專屬變更只發布對應目標；共用核心／Worker／依賴變更須驗證所有受影響目標。第一版可明確逐一 Job 執行，不預先建立複雜的依賴分析系統。
- 每個目標在有期限的部署就緒檢查後，驗證首頁／深層路由、health、登入／Session、跨專案拒絕。尚未移植的業務功能不能被基本 Smoke 成功掩蓋。
- 某目標失敗即標示該目標失敗，停止其後續發布，必要時只回復該 Worker，不動其他專案或 D1；不同目標的成敗分別記錄，不宣稱全站原子發布。

## 12. 回復規格

- Worker 程式錯誤：回復上一個 Worker Version。
- Schema 調整：使用 Expand → Deploy → Contract。
- Cleanup／Drop Column 類修改延後至下一個發布週期。
- D1 資料問題：依 Time Travel Bookmark 另行回復。
- Worker Rollback 不等於 D1 Rollback，兩者必須分開處理。

## 13. 階段、里程碑與驗收 Gate

### 13.1 看板規則

本章是實作期間的唯一進度看板。依使用者 2026-10-15 確認的新後端優先方向，M2 採「逐移植批次固定來源契約，再以新 JavaScript＋D1 測試驗證」；舊 PHP 實測是可選比對，不是強制前置條件。可以在 Auth 批次契約固定後開始 M3；其他業務 API 仍需在各自移植批次完成契約核對與驗證，不得因此宣稱全部 121 條 API 已完成。其餘 Gate 依相依順序推進。

狀態只使用：

- `未開始`
- `進行中`
- `受阻`
- `待驗收`
- `已完成`

每個里程碑必須保存：

- 實際變更檔案
- 執行指令與結果
- 測試或畫面證據
- 已知限制
- Git 恢復點；未提交時明確標示

### 13.2 總里程碑

| 階段 | 里程碑 | 目標 | 完成證據 | 狀態 |
|---|---|---|---|---|
| A 環境基線 | M0 帳號與權限 | 建立免費 Cloudflare 測試環境及最小權限 | GitHub Remote、Cloudflare Account、2FA、API Token、Secrets 與免費方案確認 | 待驗收：2FA、最小權限 Token、GitHub Secrets 與 Free Plan 已確認；Recovery Codes 待保存 |
| A 環境基線 | M1 部署鏈路 | 打通 Push → Build → Worker／Assets／D1 | 測試網址、Action 成功紀錄、Health、SPA 與 D1 Smoke | 已完成：CI 38692452088 成功；安全失敗演練 38692842610 符合預期；M0 Recovery Codes 保存仍待確認 |
| B 契約基線 | M2 API 真相包 | 固定 121 條舊 API 的真實契約 | 路由矩陣、Golden Fixtures、資料遷移盤點 | 逐批驗證中：全量靜態盤點已產出；Auth 契約見 M3_AUTH_CONTRACT.md；其餘業務隨 M4～M7 完成 |
| B 後端基礎 | M3 Worker／Auth／D1 核心 | 建立可重用但不過度抽象的後端骨架 | Router、Error Model、Auth、D1 Migration 與安全測試 | G2 通過：20 項 Worker 測試、3 項前端傳輸驗證、5 專案 Build、遠端 Auth／Worker 回復與 CI 38710616816 成功；詳見 M3_RESULT.md |
| B 多專案入口 | M3.1 固定網址與獨立部署 | 專案同時在線，不再覆蓋同一測試站 | 至少 dineCore、project-b 固定 URL、獨立資料庫與 CI／隔離／回復證據 | 已完成：2026-10-16 固定入口、獨立 D1、23 項後端測試、隔離／回復、CI 38856141952 成功；安全失敗 38856271678 符合預期，詳見 M3_1_B_D_RESULT.md |
| C Pilot | M4 project-b 垂直切片 | 證明 Vue + Worker + D1 可完整運作 | 登入、Session、Employee CRUD、契約回歸與自動部署 | 線上合成 Gate 通過：86810ff、CI 38863036522 兩站成功，61 項對應測試通過；尚無真實管理員，歷史刪除保守限制及通知延後保留，見 M4_E_DEPLOYMENT_RESULT.md |
| C 成品基線（提案） | M4.1 前端發行包與驗收 | 保存可識別、可下載、可本機還原的 ZIP | 同次建置雜湊一致、隔離包、CI 封存與下載、SPA／API 目標驗證 | 未開始（建議 M4 後、M5 前，待確認；不改既有 Gate） |
| D 專案移植 | M5 flowCenter | 移植 23 條 API 及審核交易 | 路由完成表、交易測試、前端回歸 | 未開始 |
| D 專案移植 | M6 dineCore | 分批移植 73 條 API 及檔案功能 | Guest、Staff、Map／QR、Report 四批 Gate | 未開始 |
| D 專案移植 | M7 modudesk 決策與處理 | 決定是否需要 D1 共享持久化 | 決策紀錄；需要時附 Migration 與回歸 | 未開始 |
| E 正式化 | M8 Production 收斂 | 正式入口、監控、回復與唯讀專案管理後台 | Production Smoke、Rollback Drill、操作手冊及 M8-A 清單驗收 | 未開始 |
| F 未來控制台 | M9 後台部署控制（候選） | 後台觸發部署或建立資源／網域 | 另行確認需求與安全、成本 Gate 後定義 | 未開始（不屬當前實作） |

### 13.3 階段 A：環境基線

#### M0：帳號、Repository 與權限

前置條件：無。

任務：

1. 確認 GitHub Repository 與目標 Branch；目前已確認 `origin` 指向 `takoson68/moducore_platform`。
2. 建立或確認 Cloudflare 帳號，維持 Free Plan。
3. 啟用 Cloudflare 兩步驟驗證，保存 Recovery Codes。
4. 確認測試環境採 `workers.dev`、暫不綁正式 Domain；依 Cloudflare 現行機制，實際 Worker 路由在 M1 建立 Worker 時自動產生。
5. 建立最小權限 Cloudflare API Token。
6. 將 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID` 放入 GitHub Secrets。
7. 約定 Staging Worker、D1 與後續 Production 的命名方式。

命名約定：

| 資源 | Staging | Production 保留格式 |
|---|---|---|
| Worker | `<project>-staging` | `<project>-prod` |
| D1 | `<project>-staging-db` | `<project>-prod-db` |
| D1 Binding | `DB` | `DB` |
| GitHub Environment | `staging` | `production` |

M1 空殼驗證使用 `moducore-staging` 與 `moducore-staging-db`。`workers.dev` URL 由 Worker 名稱與帳戶子網域組成，建立 Worker 前不把路由存在性列為 M0 阻擋條件。

交付物：環境清單、命名表、權限範圍與 Secrets 存在性確認；文件不得記錄 Secret 值。

M0 Gate：Cloudflare 與 GitHub 身分一致、2FA 已啟用且 Recovery Codes 已保存、最小權限 Token 在 Dashboard 為啟用、GitHub Secrets 已存在、未啟用付費方案、Repository 內不存在憑證。Token 的實際 CI 呼叫與 `workers.dev` URL 由 M1 部署鏈路驗證。

M0 完成前禁止：建立正式資料庫、綁定正式網域、移植業務 API。

#### M1：空殼部署鏈路

前置條件：M0 Gate 通過。

任務：

1. 建立最小 Wrangler 設定與測試 Worker。
2. 部署 Vue Static Assets。
3. 設定 Vue Router SPA fallback。
4. 建立 `/api/health`。
5. 建立測試 D1 Binding，執行 `SELECT 1`。
6. 建立 GitHub Actions，完成 Push → Build → Deploy。
7. 人為製造一次安全的 Staging 失敗，確認 Pipeline 會停止並留下錯誤。

交付物：Wrangler 設定、Workflow、測試 Worker、測試 D1、部署網址與 Smoke 結果。

M1 Gate／環境就緒 Gate G1：

- Git Push 可自動部署。
- 首頁及 Vue 深層路由可直接開啟。
- `/api/health` 回應成功。
- Worker 能讀取測試 D1。
- Static Assets 與 API 使用同一網域。
- 失敗部署不會覆蓋最後可用版本。

G1 未通過前，不進行任何 PHP API 移植。

### 13.4 階段 B：契約與後端基礎

#### M2：舊後端 API 真相包

前置條件：G1 通過。

任務：

1. 盤點 121 條 PHP API 路由。
2. 記錄 Method、Path、Auth、Request、Response、Status Code 與資料表。
3. 依原始碼與前端呼叫固定正常、驗證失敗、權限不足與資料不存在案例；在新 JavaScript＋D1 實作執行契約測試，作為目標行為基準。能取得舊 PHP 輸出時才追加差異比對，靜態推導值不得標示為舊環境已驗證 Golden Fixtures。
4. 區分 MySQL 專屬 SQL、交易、檔案操作與一般 CRUD。
5. 已由使用者確認只有測試資料，可由空白 D1 重建；不搬移舊帳密、Token 與訂單，不授權刪除舊庫。

交付物：API 路由矩陣、Golden Fixtures、資料表與 Migration 對照表。

M2 採逐批 Gate：該批 API 均有來源、契約、目標專案、風險與狀態後，才實作該批。M3 的 Auth 批次採 M3_AUTH_CONTRACT.md；未知業務行為保留待確認，於各專案移植時補測。全量 M2 完成仍須涵蓋所有列管路由，不因 Auth 批次完成而提前宣告。

#### M3：Worker、Auth 與 D1 核心

前置條件：M2 的 Auth 批次來源契約已固定；使用者已確認不強制建立舊 PHP／MySQL 環境。

任務：

1. 建立原生 Worker Route Table。
2. 建立統一 JSON Response、錯誤模型與 Trace ID。
3. 建立 D1 Binding 與 Migration 執行方式。
4. 改寫 login、session、logout 與權限檢查。
5. 建立 Tenant 固定綁定與輸入驗證。
6. 移除 Query String Token，密碼及 Token 只保存安全雜湊。
7. 驗證 Migration 失敗、Auth 失敗與 Worker Rollback。

交付物：Worker 核心、Auth、第一版 SQLite Schema、Migration、單元／契約測試。

M3 Gate／Pilot Ready Gate G2：

- 登入、Session、登出及未授權測試通過。
- 空 D1 可由零套用 Migration。
- 錯誤回應不洩漏 SQL、Stack 或內部路徑。
- Worker Rollback 與 D1 回復責任已分離。

### 13.5 階段 C：project-b Pilot

#### M3.1：多專案固定入口（先於 M4 部署）

前置條件：G2 通過；本次僅確認規格，正式建立資源與發布前另取得執行授權。

| 批次 | 任務 | 交付物／驗證 |
|---|---|---|
| M3.1-A | 盤點專案、環境、名稱、既有 D1 與免費額度 | 已產出 M3_1_A_DEPLOYMENT_INVENTORY.md，待驗收；1 Worker／1 D1、管理 SELECT 正常；page_count 不適用，方案／當日用量待確認 |
| M3.1-B | 建立 dineCore 與 project-b 各自設定、Worker、必要 D1 | 至少兩個可同時開啟的固定網址，前後端識別一致 |
| M3.1-C | 接上 world-oop 自動部署與隔離產物 | 不必改共享預設即可發布指定專案；目標專屬 CI／Smoke |
| M3.1-D | 更新／失敗／回復與跨專案驗證 | 更新 A 不覆蓋 B；A 的 Token、資料不被 B 接受；回復僅影響 A |

M3.1 Gate：至少兩專案同時有固定入口與獨立持久化資料邊界；各自 SPA／health／Auth 通過；CI 和 Worker 版本可追蹤；目標 A 發布／失敗／回復不改變 B 的版本及測試資料；帳戶合計成本符合第 9 章。不能以頁面可開啟當成 M4 Employee 或 M6 點餐功能完成。

#### M4：project-b 完整垂直切片

前置條件：G2 通過；其 Staging 發布依 M3.1 固定入口，不再替換 dineCore 測試站。業務契約研究與本機測試可先行，但 M4 Gate 必須包含 M3.1 通過。

分批執行：

| 批次 | 範圍 | 驗證 |
|---|---|---|
| M4-A | Health、Login、Session、Logout | Auth 契約與前端登入流程 |
| M4-B | Employee Schema、Migration、Seed | 空庫建立、Constraint、重複執行 |
| M4-C | Employee CRUD | 正常／錯誤／權限與資料一致性 |
| M4-D | Vue 串接 | 不改 World／Container，使用同網域 `/api` |
| M4-E | Staging 自動部署 | Push、Migration、Deploy、Smoke、Rollback |

2026-10-16 最新：M4-D2 主管／員工本人、權限拒絕、錯誤恢復及不同帳戶切換本機瀏覽器通過，60 項測試通過，見 M4_D2_ROLE_RESULT.md。下一步 M4-E 發布準備與另行授權；G3 仍需線上 Employee Gate，不以 Auth Smoke 代替。

最新 M4-D：核心畫面已串接、管理員真實本機 CRUD 通過；60 項自動測試及 real build 通過。主管／員工本人等瀏覽器矩陣仍待 M4-D2，未部署、G3 未通過，見 M4_D_FRONTEND_RESULT.md。

最新：M4-C 政策已由使用者同意，Employee CRUD 本機通過 42 項後端測試，見 M4_C_CRUD_RESULT.md；M4-D 畫面尚未串接、未部署。歷史引用刪除採保守拒絕，精確判定列為限制。

2026-10-16 更新：使用者確認員工與登入帳戶分開；M4-B Schema／一次性 fixture 本機通過（後端 35／35），新增 0004，尚未遠端套用。M4-C CRUD 尚未實作，授權與通知政策待確認。見 M4_B_SCHEMA_RESULT.md；不因此宣告 G3 完成。

交付物：project-b Worker API、D1 Schema、Migration、測試及部署證據。

M4 Gate／Pilot 完成 Gate G3：

- project-b 登入與 Employee CRUD 在 Staging 正常。
- Vue 主架構沒有為 Cloudflare 重寫。
- 新舊 API 契約差異均已記錄並取得確認。
- 可由 GitHub 自動部署並回復 Worker 版本。

G3 未通過前，不平行移植 flowCenter 或 dineCore。

#### M4.1：前端發行包與驗收基線（提案，未授權實作）

建議在 M4 發布完成後、M5 前先做最小成品封存，不重編 M5～M9，也不把完整版本控制台變成其他專案移植的阻擋條件。

- M4.1-A：每專案 ZIP、manifest、checksum 與短期 GitHub Artifact，部署沿用同次建置；Gate 為 CI 可下載、解壓雜湊一致、無機密／跨專案混包、封存失敗不部署。
- M4.1-B：下載既有包、不重新 Build 的本機驗收；Gate 為入口／資源／SPA 深層路由通過，API／測試資料環境明確，不誤連正式資料庫。
- M8-A 擴充：只讀版本／發布紀錄清單及下載，標示過期／失敗／當前版本。
- M9-A／B 候選：經另行確認後才做已驗證版本發布／回復，以及任意 ZIP 安全上傳／隔離預覽。

詳見 [前端版本里程碑分析](FRONTEND_RELEASE_MILESTONE_PROPOSAL.md)。版本回復不可默認只換 ZIP 或回退 D1；須核對 Worker／API／Schema 相容性。保留期與長期儲存方式仍待確認，本段不是工程或外部操作授權。

### 13.6 階段 D：其餘專案移植

#### M5：flowCenter

前置條件：G3 通過。

- 移植 23 條 API。
- 優先驗證審核狀態轉換、權限及交易一致性。
- 完成 Migration、契約回歸、前端流程與 Staging 部署。

M5 Gate：路由矩陣全數完成，主要審核流程與錯誤流程通過。

#### M6：dineCore

前置條件：M5 Gate 通過；若使用者調整業務優先級，可另行批准提前，但不得跳過 G3。

| 批次 | 範圍 | 特別 Gate |
|---|---|---|
| M6-A | Guest API | 點餐、投票、訪客狀態與冪等性 |
| M6-B | Staff API | Staff 權限、管理 CRUD 與交易 |
| M6-C | Map／QR | JSON 改存 D1、QR 動態輸出、不寫 Static Assets |
| M6-D | Report／Visitor Stats | 查詢成本、Rows Read 與日期語法 |

M6 Gate：73 條路由均有完成證據，檔案系統依賴已移除，交易與高成本查詢已驗證。

#### M7：modudesk

前置條件：確認是否需要多人或跨裝置共享。

- 不需要共享：明確保留 Browser Local 模式並記錄限制。
- 需要共享：依 M2～M4 模式建立 D1 Schema、API 與回歸。

M7 Gate／後端替換 Gate G4：所有要分享給朋友使用的專案均不依賴 PHP Runtime；保留 PHP 僅供歷史比對或進入退役程序。

### 13.7 階段 E：Production 收斂

#### M8：正式發布能力

前置條件：至少 G3 通過；要全面退役 PHP 時必須 G4 通過。

任務：

1. 建立 Production Environment 與審核 Gate。
2. 確認各專案正式入口與 HTTPS；若採自有網域，先核准成本與所有權後才綁定，否則沿用固定 workers.dev 入口。
3. 建立 Production D1、Secrets 與 Migration Gate。
4. 加入結構化日誌、錯誤追蹤及額度監看。
5. 執行 Worker Rollback 與 D1 Time Travel 演練。
6. 建立操作手冊與故障處理流程。
7. 執行 M8-A：在管理後台提供受權限保護的唯讀專案／環境清單與固定入口、成功版本、CI／部署狀態；不包含建立資源、改 DNS 或一鍵部署。自有網域非必買項目，沒有網域時可先保留已驗收的 workers.dev，若本階段要求自有網域則先取得使用者確認。

交付物：正式部署 Workflow、網域、監控、Runbook、Rollback 證據。

M8 Gate／Release Ready Gate G5：

- Production 發布需人工核准。
- Migration 失敗會阻止部署。
- Smoke Test 失敗會停止發布並保留上一版本。
- 已實際完成一次 Worker Rollback 演練。
- 已記錄 D1 還原流程及資料損失邊界。
- 月成本仍維持 NT$100 內。
- M8-A 中各專案入口、環境與版本對應正確；未授權不能取得管理資訊；未知狀態不假裝成功，也不能從瀏覽器取得 Cloudflare 管理憑證。

### 13.8 共同 Gate

每個里程碑至少檢查：

1. Git 工作區及既有修改所有權。
2. 受影響 Project Build。
3. 對應 API 契約或 Smoke Test。
4. Secrets、Token 與個資未進入 Git 或日誌。
5. Migration 可從空資料庫建立。
6. 文件、看板狀態及 `CURRENT_WORK.md` 已同步。
7. 未驗證項目、已知風險與下一步已記錄。

### 13.9 暫停與恢復規則

- 任一 Gate 未通過時，里程碑標記為 `受阻`，不得假裝完成後繼續下一階段。
- 暫停時更新 `_workspace/CURRENT_WORK.md`：完成項目、失敗證據、工作樹、唯一下一步。
- 恢復時先驗證 Git、Cloudflare 與 D1 現況，不直接相信過期紀錄。
- 每次只保留一個「唯一下一步」，避免多條支線同時開始。

### 13.10 目前唯一下一步

2026-10-16：M4 已發布（86810ff／CI 38863036522），首位持久測試管理員已建立且瀏覽器登入成功；不保存帳密。最新任務為前端 ZIP 版本管理里程碑分析，建議新增 M4.1-A／B，並延伸 M8-A／M9；詳見 FRONTEND_RELEASE_MILESTONE_PROPOSAL.md。唯一下一步是確認是否優先開始 M4.1-A 及短期保留政策，未確認前不實作或部署。M0 Recovery Codes、實際日用量與帳單再驗證仍待確認。

## 14. 已確認的架構落差

以下保留原始分析項目，須區分研究時點與目前證據；新增多專案部署規格不代表已實作。

- `assertPlatformBoundary()` 與模組初始化階段目前是空實作。
- Module Discovery 未完整保留 metadata，Visibility 規則未完整生效。
- 少數模組存在跨模組直接 import。
- modudesk 的 `task`／`tasks` 設定名稱不一致。
- 後端 README 提及的部分 Migration 不存在。
- 原分析時沒有正式測試套件、Wrangler 或 GitHub Actions；M1／M3 已建立，見 M3_RESULT.md。
- 一般 Vite Build 保留 PHP public 複製，Cloudflare 模式已停用，見 platform/frontend/vite.config.js。
- 固定入口、各自 D1、多目標 GitHub CI 已於 M3.1 驗收，moducore-staging 保留不變；業務 API 不因此視為已移植。

## 15. 實作前待確認

1. Pilot 是否採 project-b。
2. 是否存在需要從 MySQL 移轉的正式資料。
3. 第一版登入使用 Bearer Token 或 HttpOnly Cookie。
4. modudesk 是否需要跨裝置及多人共享。
5. 哪些專案需要獨立 Staging D1。

上述項目依所屬 Gate 確認後，可按 M0 至 M8 逐段執行，不需要重新設計 moduCore 核心。

## 16. 官方參考資料

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [SPA Routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/)
- [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [GitHub Actions Deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
