---
status: active
phase: cloudflare-transition
authority: git-guide
updated: 2026-10-15
implemented: true
canonical: ../_VibeCore/engineering/GIT_AUTOMATION.md
---

# Git 工作規則

完整規則以 `_VibeCore/engineering/GIT_AUTOMATION.md` 為準。

## 開始前

- 執行 `git status --short --branch`。
- 確認目前 Branch、Remote 與既有修改。
- 不覆蓋、不清除、不回退來源不明的修改。
- 工作樹不乾淨時，將本次變更限制在可明確辨識的檔案。

## 操作權限

- 檢查 Status、Diff、Log：可直接執行。
- 修改檔案：依使用者任務範圍執行。
- Commit：只有使用者明確要求保存進度時執行。
- Push、Merge、建立 PR、刪除 Branch：只有使用者明確要求時執行。
- Production Deploy 不因 Push 授權自動成立。

## Commit

- 一筆 Commit 聚焦一個可描述、可驗證的變更。
- 建議格式：`<分類> - <繁體中文摘要>`。
- 分類使用 `feat`、`fix`、`refactor`、`docs`、`chore`、`research`。
- Commit 前先檢查 Diff、驗證結果與敏感資料。

## Cloudflare CI/CD

- Secrets 只放 GitHub Secrets 或 Cloudflare Secrets。
- Staging 與 Production 使用不同 Environment 與資料庫 Binding。
- Production Workflow 必須有人工作業 Gate。
- Migration 失敗或 Smoke Test 失敗時不得繼續發布。

