# Staging 切換 dineCore

2026-10-15，使用者授權 Commit、Push 與自動部署。僅調整測試站的專案選擇，不變更 World／Container／Module，不移植業務 API。

- Commit：`e954ab9` 切換設定、`73b72bc` 補上部署期間專案識別切換的有限等待。
- 前端 Cloudflare build 預設與 CI `VITE_PROJECT`、Worker `PROJECT_ID`、遠端 Auth 驗收 tenant 均為 `dineCore`。
- 本機 `.env` 保持原樣；線上沿用 real API 模式，不把 mock 當成後端完成。
- 本機 dineCore real／mock 建置、20 項 Worker 測試、3 項 API 傳輸測試、Wrangler dry-run 均通過。
- 實際瀏覽器已確認首頁顯示「桌邊點餐」「掃碼點餐」「進入菜單」；dineCore Session 200，project-a 被拒絕 403 PROJECT_MISMATCH。
- 完整遠端登入、Session、到期、跨 tenant、登出及合成帳戶清除通過。
- 首次 CI 38711866333 在部署剛完成讀到舊 tenant 而失敗；修正只作用於驗收前的有期限就緒等待，不放寬任何 API 權限。

最新 CI：[38712004231](https://github.com/takoson68/moducore_platform/actions/runs/38712004231) 全數成功，含公開 HTTP 與遠端 Auth。線上 Worker 版本：`2a42b8d1-62ae-4a53-b457-12d0f465c400`，網址：https://moducore-staging.takoson68.workers.dev/ 。

限制：菜單、購物車、點餐、員工營運等 dineCore 業務 API 尚未移植，可能顯示資料載入錯誤；未建立預設登入帳密，也未新增或清空舊專案資料。這次切換不代表 M4～M7 已完成。
