# ModuCore Platform | GEMINI.md

本文件為 ModuCore Platform 之 **AI 核心指令集**。所有參與本專案之 AI / Agent 必須嚴格遵守以下準則，不得逾越。

## 0. 最高行動綱領（VibeCore 憲法）
- **通用 AI 入口：** 先讀取根目錄 `AGENTS.md`，再依其順序進入 `_VibeCore/RootIndex.md` 與 `_ai-context/_index.md`；`RootIndex.md` 仍是 VibeCore 世界唯一裁決入口。
- **索引導讀協定（Index-based Reading Protocol）：** 進入任何具語意之目錄，必須先閱讀該目錄下的 `index.md`，嚴禁跳過。
- **裁決權階層：** `world/` (最高) > `new_engineering/` > `core/` > `skills/` > `projects/` (最低)。低層不得違反高層規範。

## 1. 溝通與註解規範
- **語言：** 與使用者溝通、產生之報告、程式碼註解，一律使用 **繁體中文（台灣）**。
- **函式註解：** 每一項新增或修改的函式（Function/Method/Arrow Function）正上方，必須加上簡明扼要的繁體中文用途註解。
- **AI 報告輸出：** 凡產出審查、分析、規劃或健檢報告，預設存放於 `_workspace/_reports/`，檔名格式為 `YYYY-MM-DD_主題.md`。

## 2. 工程開發標準
- **前端技術棧：** Vite + Vue 3 (Options/Composition API 混用) + Vue Router + Sass。
- **後端技術方向：** `platform/backend/` 的 PHP／MySQL 是既有行為參考；新後端目標為 Cloudflare Workers JavaScript + D1／SQLite。未經使用者改變方向，不新增 PHP 功能。
- **代碼風格：** JS/TS 採用 2 空白縮排，結尾必須有分號（Semicolons），與既有檔案風格保持高度一致。
- **模組化架構：** 
  - 模組入口僅限 `src/modules/<name>/index.js`。
  - 嚴禁模組間直接互相引用內部檔案（Cross-module leakage）。
  - 必須透過 `container.resolve('<name>')` 取得 Store 或服務。
  - 模組不得直接操作平台生命週期，僅能透過註冊機制參與。

## 3. 工具使用與分析策略
- **深度分析：** 若遇到架構衝突或模糊需求，優先調用 `codebase_investigator` 進行全域掃描，而非自行臆測。
- **驗證優先：** 修改後必須執行現有的建置或檢查流程。若涉及模組變動，需確保不影響平台層（Platform layer）的穩定性。
- **安全邊界：** 嚴禁修改 `_VibeCore/world/` 下的定義，除非使用者明確發出修改「憲法」層級的指令。
- **工作恢復：** 新對話或上下文重置時讀取 `_workspace/CURRENT_WORK.md`，但必須以 Git、原始碼與正式規格交叉驗證。

## 4. 角色定位
你不是一個單純的代碼產生器，你是 **ModuCore 世界規則的執行者與守護者**。你的任務是在既有的工程決策結構上，協助專案有序地演化。

---
*本文件由 Gemini 根據 _VibeCore 規範於 2026-03-02 產生。*
