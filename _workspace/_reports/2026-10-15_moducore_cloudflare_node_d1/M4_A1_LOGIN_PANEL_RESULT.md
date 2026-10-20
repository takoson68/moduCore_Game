# M4-A1 登入面板本機修正

2026-10-16：本機修正完成，未 Commit／Push／部署，未建立任何真實或遠端合成帳戶。線上仍是 M3.1 版本。

## 變更

- project-b/components/PlatformLoginPanel.vue：清空帳密預填及示範提示；登入／還原／登出均 try/catch/finally，防重送並解除 loading。密碼不 trim，送出後清空。
- 錯帳密、限流、專案不符、網路失敗使用固定安全文案，不顯示後端原始訊息。成功回應缺 user／token 不關閉面板。
- 登出須 API 確認才導回首頁；HTTP 或網路失敗顯示未確認。平台 authApi 原有本機清理行為不變，不把本機清理當成伺服器已撤銷。
- 錯誤於開啟的彈窗內或關閉狀態的面板外顯示 role=alert，避免還原／登出錯誤被隱藏。
- 沿用既有 scoped Sass，限制於 project-b 面板，不擴散樣式。沒有新增登入狀態、框架或修改 World／Container／共享 Auth API。
- 新增 scripts/test-project-b-auth.mjs、npm test:project-b-auth；Workflow 的 project-b Job 接入此測試，但未 Push，GitHub 尚未使用新步驟。

## 驗證

- 面板邏輯 10／10：執行實際 script setup，隔離 Vue／Router／API，覆蓋初始空欄位、成功、401／403／429／500、例外、不完整回應、防重送、還原及登出。
- 既有 API 傳輸測試 3／3 通過。
- project-b real Cloudflare 建置通過，僅輸出本機隔離目錄；git diff --check 通過。
- 本機瀏覽器確認「Project B」登入彈窗，兩欄空白、無示範帳密，未輸入或提交任何憑證。截圖 /private/tmp/project-b-login-clean.jpg。

限制：邏輯測試不是已掛載 Vue 的完整整合測試；沒有驗收真實帳戶登入、重整／深層路由競態、停用或遠端撤銷。本機預覽不代表 Worker 已部署。

## 下一步

M4-A2：實作只接受 project-b Staging 固定目標的受控佈建 CLI，先用本機合成資料驗證安全輸入、重跑拒絕、原子性及不洩漏憑證。真實帳號／顯示名稱／管理角色需另確認，密碼不在對話提供。佈建與前端完整 Gate 未通過前，不標記整個 M4-A 完成。
