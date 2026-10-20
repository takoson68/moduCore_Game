# ModuCore AI Entry

本檔是 Codex、Claude、Gemini 與其他 AI Agent 進入此 Repository 的通用入口。

## 初始化必讀

每次新對話、上下文重置或接手未完成工作時，依序完整讀取：

1. `_VibeCore/RootIndex.md`
2. `_ai-context/_index.md`
3. `_ai-context/_index.md`「初始化必讀」列出的文件
4. 當前任務所屬 `_VibeCore` 目錄的 `index.md` 與直接相關文件

若任務涉及建立或修改工程內容，另依 `_VibeCore/RootIndex.md` 完整讀取 `_VibeCore/skills/index.md`。

初始化的目標是取得足夠且最新的上下文，不是全量預讀所有歷史文件。完成初始化後即可直接執行任務，不需要只回覆固定口令後停下等待。

`_ai-context/` 是操作與導讀層；`_VibeCore/` 才是正式治理與工程裁決來源。兩者衝突時一律以 `_VibeCore/RootIndex.md` 及其合法導讀鏈為準。

## 核心限制

- 與使用者溝通、報告及程式註解使用繁體中文（台灣）。
- `_VibeCore/world/` 是最高治理層，未經世界變更流程不得修改。
- 文件與實作不一致時，必須同時指出預期規則與實際證據，不可默默假設兩者一致。
- 不覆蓋、不清除、不回退來源不明的既有修改。
- 未經使用者要求，不自行 Commit、Push、Merge 或部署。
- 分析、研究與規格報告預設輸出至 `_workspace/_reports/`。
- 舊 PHP／MySQL 後端是移植行為參考；目標後端是 Cloudflare Workers JavaScript + D1／SQLite。未經使用者改變方向，不新增 PHP 功能。

## 資訊優先級

發生衝突時依序判斷：

1. 使用者當前明確指令。
2. `_VibeCore/RootIndex.md` 與 `_VibeCore/world/`。
3. `_VibeCore/engineering/` 已生效規則。
4. 實際原始碼、設定、測試與命令輸出。
5. `_VibeCore/feedback/` 中已確認的狀態。
6. `_workspace/CURRENT_WORK.md`。
7. `_workspace/` 歷史草稿與舊報告。

`CURRENT_WORK.md` 只用來恢復停止點，不可覆蓋程式碼、正式規格或驗證結果。

