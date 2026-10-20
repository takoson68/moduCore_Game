## 2026-10-15

- 參考 `h5-basic-style` 的 AI 導讀與工作恢復方式，新增根目錄 `AGENTS.md` 作為跨 AI 工具入口
- 建立 `_ai-context/` 操作層，包含 AI 實作引導、架構摘要、工程摘要、導讀、紀錄、Git 與語言規則
- `_ai-context/` 僅負責導讀與工作方式，正式裁決仍由 `_VibeCore/` 負責，避免複製規則後形成雙重真相
- 新增 `AI_WORKFLOW.md`，定義任務開始、證據分類、驗證矩陣、完成條件及資料分流
- 新增 `_workspace/CURRENT_WORK.md` 與 `_workspace/_index.md`，建立最小可恢復的工作狀態
- 更新 `AI_PROJECT_ENTRY.md` 的現況專案清單、最小導讀與 Cloudflare Workers + D1 後端方向
- 未修改 `_VibeCore/world/`，既有 World 裁決層級維持不變

## 2026-03-10

- 將「每完成一個 Phase 或一組 Task，必須執行一次設計哲學偏離檢查」正式納入 `engineering/index.md`
- 偏離檢查明確要求覆蓋：世界邊界、模組責任、命名規則、資料流方向、架構原則
- 若發現偏離，必須先修正偏離，再進入下一階段
- 新增正式規則：`new_engineering/` 中已成熟且常用的工程規範，必須倒入 `engineering/`
- 將下列成熟 convention 倒入 `engineering/CONVENTIONS.md`：Project API Boundary Non-Pollution、Module Data Ownership、Module Registry Boot Pipeline、Layout And Route Resilience、Project Services Hard Boundary、Store And API Boundary
