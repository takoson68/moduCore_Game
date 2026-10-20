---
status: active
authority: repository-entry
updated: 2026-10-15
implemented: true
---

# AI 專案入口

## 用途
此檔案是 AI 代理在此儲存庫中工作的實務入口點。

根目錄 `AGENTS.md` 是跨 AI 工具的實務入口；本檔負責把 VibeCore 規則映射到目前 Repository。請在閱讀以下內容後使用本檔：

1. `_VibeCore/STARTUP_DECLARATION.md`
2. `_VibeCore/RootIndex.md`
3. 相關的 `_VibeCore/**/index.md`
4. `_workspace/CURRENT_WORK.md`（只用於恢復停止點）

若任務涉及 project instance 的建立、理解或整理，另需依序閱讀：

5. `_VibeCore/projects/index.md`
6. `_VibeCore/projects/PROJECT_AUTHORING_STANDARD.md`
7. `_VibeCore/projects/PROJECT_SCAFFOLD_PROTOCOL.md`
8. `_VibeCore/projects/templates/index.md`

它的角色與 world 文件不同：

- `_VibeCore/world/` 定義治理、邊界與詞彙
- 本檔將這些規則映射到目前的程式碼庫
- 本檔是描述性的，不凌駕於 world 規則之上

---

## 此儲存庫實際包含的內容

頂層結構：

- `_VibeCore/`
  - 治理、world 規則、工程筆記、專案層定義
- `platform/frontend/`
  - 目前實際運作中的 Vue + Vite 前端執行環境
- `platform/backend/`
  - 精簡的後端/API 區域
- `_workspace/`
  - 工作區支援區域

重要觀察：

- 真正可執行的前端位於 `platform/frontend/`
- 儲存庫根目錄沒有單一的 `package.json`
- 專案選擇由前端的 env/config 驅動，而不是由儲存庫根工具鏈驅動

---

## 權威性對照

在推理此儲存庫時，請使用以下優先順序：

1. `_VibeCore/world/`
   - world 規則、邊界、生命週期、命名、輸出期望
2. `_VibeCore/projects/index.md`
   - 專案層的意義
3. `_VibeCore/projects/PROJECT_AUTHORING_STANDARD.md`
   - project 文件的固定寫法與章節責任
4. `platform/frontend/` 與 `platform/backend/` 下的實際原始碼、設定、測試與命令輸出
   - 目前實作的真實狀況；不得因實作存在就反向放寬 World 規則
5. `_workspace/CURRENT_WORK.md`
   - 只提供最近停止點，不具架構裁決權
6. 根目錄 `README.md`
   - 提供上下文概覽，但不能完全視為真實來源

實務解讀：

- 使用 `_VibeCore/world/` 了解系統預期如何運作
- 使用 `platform/frontend/` 下的程式碼驗證目前實際如何運作
- 若文件與程式碼不一致，應將此不一致視為真實的工程發現

---

## 給代理的快速閱讀順序

對大多數工程任務，請依以下順序閱讀：

1. `_VibeCore/STARTUP_DECLARATION.md`
2. `_VibeCore/RootIndex.md`
3. `_VibeCore/world/index.md`
4. `_VibeCore/engineering/index.md`
5. `_VibeCore/engineering/AI_WORKFLOW.md`
6. `_workspace/CURRENT_WORK.md`
7. 依當前任務進入相關層級的 `index.md`
8. 只讀取與任務直接相關的原始碼

不再將所有 World 文件、所有 Project 文件或所有歷史報告列為每次初始化必讀；需要使用某層裁決時，再依該層 `index.md` 完整讀取其要求內容。

若任務涉及後端/API 行為，也請閱讀：

1. `platform/backend/README.md`
2. `platform/backend/` 下的後端入口與路由檔案

---

## Project 文件導讀規則

當任務涉及「建立新專案」、「整理專案文件」、「校正專案結構」或「理解某個 project instance」時，請遵守以下順序：

1. 先讀 `_VibeCore/projects/index.md`
2. 再讀 `_VibeCore/projects/PROJECT_AUTHORING_STANDARD.md`
3. 再讀 `_VibeCore/projects/PROJECT_SCAFFOLD_PROTOCOL.md`
4. 若需套用模板，再讀 `_VibeCore/projects/templates/index.md`
5. 之後才可進入該 project 的 `index.md`
6. 再由該 project 的 `index.md` 導向 `PROJECT_CONTEXT.md`、`project.config.js`、`layout/`、`modules/`、`decisions/`

實務規則：

- project 目錄的唯一入口是該目錄自己的 `index.md`
- 專案背景、目標、限制、假設的唯一主文件是 `PROJECT_CONTEXT.md`
- 架構取捨與例外決策應集中在 `decisions/`
- 不得用 `README.md` 取代 project `index.md`

---

## 前端執行入口

目前前端啟動路徑為：

1. `platform/frontend/src/main.js`
   - 建立 Vue app
   - 匯入 `world`
   - 等待 `await world.start()`
   - 使用 router 與 project config 掛載 app
2. `platform/frontend/src/world.js`
   - 平台前端的執行時 facade
   - 負責啟動順序
   - 對外暴露 `store()`、`service()`、`router()`、`http()`、`authApi()`、`projectConfig()`
3. `platform/frontend/src/app/boot/boot.js`
   - 將 project config 同步到平台狀態
   - 發現可見模組
   - 安裝允許的模組
   - 進入執行階段
4. `platform/frontend/src/router/`
   - 建立最終路由樹
   - 使用已註冊的模組路由

這表示：

- `world.js` 才是真正的執行時 facade
- `boot.js` 是目前的協調中心
- router 會在 project/module 解析後才組裝完成

---

## 專案解析

目前的專案選擇機制：

- 前端使用 `import.meta.env.VITE_PROJECT`
- 預設回退專案是 `project-a`
- 專案設定由 `platform/frontend/projects/loadProject.js` 載入
- Vite alias `@project` 指向 `platform/frontend/projects/${VITE_PROJECT}`

相關檔案：

- `platform/frontend/vite.config.js`
- `platform/frontend/projects/loadProject.js`
- `platform/frontend/projects/modulesRegistry.js`

影響：

- 從 `@project/...` 匯入的任何程式碼都是專案特定的
- 版面、樣式與模組註冊表都會依目前啟用的專案決定
- 變更 `VITE_PROJECT` 會改變目前啟用的專案表面

---

## 模組安裝模型

目前實作與 world 中「由專案選擇模組」的概念一致。

觀察到的流程：

1. 載入 project config
2. 從專案中繼資料發現模組
3. 解析可見性
4. 專案模組註冊表安裝允許的模組
5. 將模組 routes/stores 註冊進執行時結構

關鍵檔案：

- `platform/frontend/projects/moduleDiscovery.js`
- `platform/frontend/projects/modulesRegistry.js`
- `platform/frontend/src/app/boot/boot.js`
- `platform/frontend/src/app/container/register.js`
- `platform/frontend/src/router/routes.js`

給代理的實務規則：

- 除錯模組可見性時，從 `boot.js` 開始
- 除錯模組註冊時，檢查 `@project/modules/index.js`
- 除錯路由曝光時，檢查 `register.routes(...)` 與 `src/router/routes.js`

---

## Container 與 Store 的現況

world 文件將 container 描述為能力閘道。
目前實作在前端執行時程式碼中反映了這一點。

請先閱讀：

- `platform/frontend/src/app/container/container.js`
- `platform/frontend/src/app/container/index.js`
- `platform/frontend/src/app/container/register.js`
- `platform/frontend/src/app/stores/index.js`

目前現況：

- 核心 stores 會在 `world.start()` 期間註冊
- 模組透過 register facade 註冊 stores/routes
- `world.store(name)` 與 `world.service(name)` 是主要的外部存取點

代理指引：

- 優先沿著 `world` -> `boot` -> `container` 追蹤行為
- 不要假設直接的跨模組耦合是預期設計
- 在假定某能力存在之前，先驗證它是否已被註冊

---

## Router 現況

目前路由系統由以下部分組裝而成：

- 平台頁面
- 模組公開路由
- 模組授權路由
- 專案版面根節點

主要檔案：

- `platform/frontend/src/router/index.js`
- `platform/frontend/src/router/routes.js`
- `platform/frontend/src/router/guards.js`
- `platform/frontend/src/app/container/register.js`

重要實作細節：

- 模組路由會累積在 `window` 上的一個執行時 bucket 中
- router 子節點會掛載在根路由下，使用 `@project/layout/LayoutRoot.vue`

若路由看起來不正確，請檢查：

1. 模組路由中繼資料
2. 路由註冊時機
3. guard 預期
4. 目前啟用的專案版面

---

## 目前啟用的專案表面

`platform/frontend/projects/` 下目前的專案目錄包括：

- `project-a`
- `project-b`
- `dineCore`
- `flowCenter`
- `modudesk`
- `_proTemp`

觀察到的常見專案結構：

- `index.md`
- `PROJECT_CONTEXT.md`
- `project.config.js`
- `layout/`
- `modules/`
- `styles/`
- `decisions/`
- 可選的 `components/`、`services/`、`composables/`

建議假設：

- `modudesk` 看起來是持續演進中的活躍專案
- `project-a` 與 `project-b` 是已建立的範例/參考實作
- `_proTemp` 看起來像是樣板或暫存專案

請將其視為工作推論，而不是 world 規則。

若某個專案缺少 `index.md` 或 `PROJECT_CONTEXT.md`，應視為 project 文件結構尚未補齊，而不是默認其可以自由格式運作。

---

## 後端現況

現有後端是 PHP 8 + PDO MySQL，保留為 API 行為、資料模型與移植驗證的參考來源。已確認的目標 Runtime 是 Cloudflare Workers JavaScript + D1／SQLite。

已知入口脈絡：

- `platform/backend/README.md`
- 後端公開入口描述為 `public/api.php`
- 後端路由描述為 `src/routes.php`

代理指引：

- 不要假設前端 world 的抽象在後端程式碼中有完整對映
- 在宣稱對等性之前，先直接從後端原始碼驗證行為
- 不為既有 PHP 後端新增功能；新功能與移植目標以 Workers JavaScript 為準
- 未完成契約對照與資料遷移驗證前，不刪除 PHP 參考實作

---

## 常見任務要讀什麼

### UI 或頁面問題

請閱讀：

1. 目前啟用專案的 `index.md`
2. 目前啟用專案的 `PROJECT_CONTEXT.md`
3. 目前啟用專案的 `layout/`
4. 目前啟用專案的 `modules/`
5. `platform/frontend/src/router/`
6. `platform/frontend/src/world.js`

### 模組未出現

請閱讀：

1. 目前啟用專案的 `index.md`
2. 目前的 `project.config.js`
3. `platform/frontend/projects/moduleDiscovery.js`
4. `platform/frontend/src/app/boot/boot.js`
5. 目前啟用專案的 `modules/index.js`
6. 該模組的 `routes.js` 或註冊入口

### Store 或狀態問題

請閱讀：

1. 目前啟用專案的 `PROJECT_CONTEXT.md`
2. `platform/frontend/src/app/stores/`
3. `platform/frontend/src/app/container/`
4. `platform/frontend/src/world.js`
5. 相關的專案/模組 store 檔案

### Auth 或 Session 問題

請閱讀：

1. `platform/frontend/src/app/api/`
2. `platform/frontend/src/app/stores/authStore.js`
3. `platform/frontend/src/router/guards.js`
4. 後端 auth/session 端點

### Build 或部署問題

請閱讀：

1. 目前啟用專案的 `index.md`
2. `platform/frontend/package.json`
3. `platform/frontend/vite.config.js`
4. 目前啟用專案的 `dist/` 目標行為
5. `platform/frontend/vite.config.js` 中既有 PHP public 複製行為
6. `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/EXECUTION_SPEC.md`

---

## 治理與程式碼之間已知落差

代理應明確保留以下區別：

- `_VibeCore/world/` 作為治理模型，比目前程式碼庫的實作更完整
- 某些儲存庫層級文件較舊，或在終端輸出時編碼安全性較差
- 與前端/執行時治理細節相比，後端文件相對精簡
- 某些執行時行為是透過實用機制實作，例如 `window` bucket 與 facade wrapper

不要默默抹平這些落差。
若有需要，請回報：

- 預期模型
- 目前實作
- 不一致之處
- 風險或影響

---

## 對未來代理的輸出期望

在使用本檔時，未來的代理應清楚說明：

- 他們正在讀取哪一層
  - world 治理
  - 專案定義
  - 實際前端程式碼
  - 實際後端程式碼
- 某項主張是基於文件，還是已在原始碼中驗證
- 預期架構與目前實作之間是否存在落差

本檔應在以下情況更新：

- 前端入口流程變更
- 專案選擇機制變更
- container 或 router 的擁有權變更
- 後端入口拓樸變更
- 新的 canonical project 成為主要活躍表面
