# M4-A3 本機登入整合驗收

日期：2026-10-16。結論：本機前端＋實際 Worker＋一次性 D1 登入流程通過；尚未 Commit、Push、部署或建立遠端真實帳戶。

## 驗收結果

| 項目 | 實際結果 |
|---|---|
| 未登入直接開啟 `/employee` | 返回 `/` 公開頁 |
| 合成帳戶透過畫面登入 | 顯示登入身份與側欄，可進入 `/employee` |
| 有效登入重新整理深層網址 | 身份還原、保留 `/employee` |
| D1 將 Token 設為過期後重整 | 清除身份，返回 `/`，不保留個人資料表單 |
| D1 停用帳戶後重新進入深層網址 | 清除身份並返回 `/` |
| 重新啟用後登入、從管理頁登出 | 返回 `/`，D1 revoked 計數增加一筆；重整維持未登入 |

測試透過瀏覽器操作真實建置檔，不是 mock API。登出後舊 Token 直接重送由既有後端自動測試覆蓋，本輪瀏覽器未擷取或重送 Token。停用帳戶重新啟用可能使其舊有效 Token 再次有效，本輪不宣稱停用等同永久撤銷全部 Session；後續帳戶停用 API 須明確處理此政策。

## 本輪修正與證據

- 發現：過期還原會清除 authStore，但既有路由守衛已放行，仍停留 `/employee` 並顯示個人資料表單。
- 修正：`platform/frontend/projects/project-b/layout/LayoutRoot.vue` 在失去登入狀態時，依既有 route access metadata 返回公開首頁；只修改 project-b，不修改共享 Router、World 或 Container。
- 回歸：`platform/frontend/scripts/test-project-b-auth.mjs` 新增 Layout 失去登入測試；合計 11／11 通過，API 傳輸測試 3／3、Worker 測試 31／31 通過，project-b real build 成功。
- 驗收工具：`platform/worker/scripts/local-project-b-auth-e2e.mjs`，僅綁定 loopback、一次性資料庫，沿用 M4-A2 佈建及現有 Migration。Static Assets 使用 project-b real build。以互動終端啟動，stdin 可控制過期／停用／啟用；不提供 HTTP 控制端點。
- 操作畫面證據：`/private/tmp/project-b-auth-e2e-result.jpg`（暫存畫面，非版本化交付物）。

本機工具曾遇到測試連接埠被瀏覽器禁止及 Miniflare Assets routing 設定不足，已限定使用 8789 並補工具設定；不是遠端站點故障。

## 範圍與下一步

`/employee` 顯示空表不代表 CRUD 完成：Worker 尚未移植 Employee API。此次沒有真實帳密、遠端寫入、遠端 Migration、付費資源或部署；驗收程序與分頁已關閉，一次性帳戶／DB 已丟棄。未驗證網路中斷的所有還原競態或初始畫面零閃現。

下一步 M4-B：固定 Employee 資料模型、角色與帳戶關聯契約，再實作 Workers＋D1 CRUD。M4-A Staging 發布、真實管理員資料與帳戶建立需另外確認，不以本機 Gate 代替線上驗收。

設計偏離檢查：保持既有平台身份資料流與專案邊界；沒有新框架、抽象層或 World 修改。成本維持原方案，本輪只使用本機資源。
