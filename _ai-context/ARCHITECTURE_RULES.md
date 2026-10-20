---
status: active
phase: cloudflare-transition
authority: architecture-summary
updated: 2026-10-15
implemented: true
canonical: ../_VibeCore/RootIndex.md
---

# 架構規則摘要

本文件是 AI 快速摘要，不是新的架構裁決來源。完整規則由 `_VibeCore/RootIndex.md` 及其導向的 `world/`、`engineering/`、`core/`、`skills/`、`projects/`、`api/`、`modules/` 決定。

## 核心邊界

- World 定義不可被下層推翻的治理、角色與生命週期。
- Engineering 定義如何安全工作，不得違反 World。
- Core 提供能力，不承載 Project 業務。
- Skills 組合工程策略，不擁有裁決權。
- Projects 選擇 Module 與承載商務情境，不反向污染平台。
- Module 必須可註冊、可缺席，不直接依賴其他 Module 內部。
- Container 是能力閘道；跨模組能力應透過公開註冊或 API truth。

## 執行邊界

- 前端啟動沿 `main.js → world.start() → boot → module runtime → router` 追蹤。
- 一次 Build 只選擇一個 `VITE_PROJECT`。
- 平台共享層不得加入單一 Project 特例。
- 模組狀態不是跨角色、跨裝置的共享事實來源；共享資料應進 API／D1。
- 新後端使用 Workers JavaScript + D1／SQLite，但不得因此重寫 moduCore 前端核心。

## 禁止事項

- 未依 Change Protocol 修改 `_VibeCore/world/`。
- 跳過目錄 `index.md` 推測責任。
- 為 Cloudflare 導入不必要的微服務、ORM 或抽象層。
- 在 Static Assets 執行期間寫入檔案。
- 把 Secrets、Token、Cookie 或正式憑證寫入 Git。
- 把舊 PHP 實作當作未來 Runtime 繼續擴充。

## 衝突處理

遇到規則與程式不一致時，同時記錄：

1. 正式規則。
2. 實際程式行為。
3. 驗證證據。
4. 影響與風險。
5. 本次修正或待人類裁決事項。

