---
status: active
phase: cloudflare-transition
authority: engineering-summary
updated: 2026-10-15
implemented: true
canonical: ../_VibeCore/engineering/index.md
---

# 工程標準摘要

完整規則以 `_VibeCore/engineering/index.md`、`CONVENTIONS.md` 與任務相關 Contract 為準。

## 修改原則

- 先確認責任層，再修改檔案。
- 保留使用者既有變更，不自行 Stash、回退或混入無關修改。
- JS／TS 採 2 空白縮排及分號，並尊重既有檔案風格。
- Vue 新增內容遵守 `<script setup>`、Pug 與縮排式 Sass 的正式規則。
- 新增或修改函式時，依專案規定加入繁體中文用途註解。
- 單一 Project 的 API 差異留在 Project／Module，不污染共享 API helper。
- 不建立跨 Module 的私有檔案引用。

## Cloudflare 轉換

- `platform/backend/` PHP／MySQL 只作契約及行為參考。
- 新 API 以原生 Worker Route Table 起步，不預設框架。
- MySQL Migration 必須重寫成 SQLite，不機械取代語法。
- Worker Rollback 與 D1 資料回復分開處理。
- Static Assets、Worker API 與 D1 先在 Staging 完成 Gate。
- 每個 Project 原則上獨立 Worker；資料型 Project 使用獨立 D1。

## 最低驗證

| 變更 | 最低驗證 |
|---|---|
| 文件 | 路徑、索引、連結、Diff |
| 單一 Project | 該 Project Build |
| 平台共享前端 | 代表性多 Project Build |
| API／Auth | 契約測試與 Smoke Test |
| D1 Migration | 空庫建立、Constraint、失敗回復 |
| 部署 | Staging Deploy、SPA、Health、D1、Rollback |

無法執行的驗證必須明確記錄。

