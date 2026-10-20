# M4-A project-b 登入與帳戶佈建契約

日期：2026-10-16。狀態：來源核對已完成；安全佈建方案為建議，尚未實作或建立帳戶，前端完整登入 Gate 未驗收。本輪只修改文件，不 Commit／Push／部署。

後續進度：M4-A1 面板已於本機修正，10 項面板邏輯測試、3 項 API 傳輸測試、real build 與初始畫面驗證通過，見 [M4-A1 結果](M4_A1_LOGIN_PANEL_RESULT.md)。下列來源問題表保留為修正前基準；佈建工具與完整前端登入 Gate 尚未完成，沒有建立真實帳號或部署。

更新：M4-A2 受控 CLI 已完成本機合成驗證，見 [佈建工具結果](M4_A2_PROVISIONING_RESULT.md)；31 項後端測試、TTY 不回顯通過。遠端分支只用 fetch 模擬，M4-A3 完整前端 Gate 與真實帳號建立仍未執行。下列建議流程與來源發現保留供追蹤，不代表皆已實作。

## 1. 已確認的實際入口

最新更新：M4-A3 本機真實前端＋Worker＋一次性 D1 Gate 已通過，見 [整合驗收](M4_A3_AUTH_E2E_RESULT.md)。上方未執行狀態為歷史紀錄；尚未提交、部署或建立遠端真實帳戶，Employee CRUD 未完成。

- `platform/frontend/projects/project-b/project.config.js:3`：名稱及 tenant 為 project-b；專案無 index.md，依既有專案規則由 config 進入，不補造文件。
- `platform/frontend/projects/project-b/layout/LayoutRoot.vue:6` → `components/ProjectTopbar.vue:7` → `components/PlatformLoginPanel.vue:18`、`:32`、`:50`：實際登入面板經 world.authApi() 還原、登入、登出。共享 src/components/LoginModal.vue 不是此條已確認入口，不將其問題誤認為 project-b 實際登入流程。
- `platform/frontend/src/app/api/index.js:85`：以 username/password 登入，成功才將後端 user 投影至 authStore、Token 交 tokenStore；不增加第二份專案登入狀態。
- `platform/frontend/src/app/stores/authStore.js:15` 的 login(user) 只寫狀態，不是網路登入函式。不得改由 UI 直接呼叫它代替 API。
- `platform/frontend/src/router/guards.js` 目前依 authStore 判斷登入；不是後端角色授權的替代品。

## 2. 登入契約（沿用已實作 M3）

目標為 project-b-staging，DB 為其專屬 project-b-staging-db；不使用 dineCore 或舊站資料。

| 動作 | 請求／成功回應 | 失敗／匿名 |
|---|---|---|
| 登入 | POST /api/login，X-Project=project-b，JSON username/password；success、user、token | 欄位 400、錯帳密／停用 401、跨專案 403、頻率限制 429 |
| 還原 | GET /api/session 或 /api/restore-session，Bearer；authenticated=true、user、token | 未知／過期／撤銷／停用為 200、authenticated=false |
| 登出 | POST /api/logout，Bearer；success=true | 可重複呼叫，不能僅清除本機 Store |

user 必含 id、tenant_id、username、name、role、company_id、is_super_admin。project-b 無公司隔離需求的證據，先沿用空 company_id，不引入新公司模型。

Workers `platform/worker/src/auth.js:59`、`:92`、`:118`：伺服器固定 tenant；username trim／小寫、password 不 trim；8 小時 Session、隨機 Token 只存 SHA-256。`src/credentials.js:27`：新密碼為 scrypt 固定參數，沿用 M3 契約，不在本批改算法或新增公開註冊。

舊 `platform/backend/src/Controllers/AuthController.php` 將 project-b／project_b 視為別名、由員工表讀姓名與角色，密碼直接查詢，Session 不以 tenant 限縮。新環境固定 project-b，users 為身份真相；不重建舊別名或不安全行為。

## 3. 已發現必要調整

| 來源 | 實際問題 | 最小後續修改 |
|---|---|---|
| project-b/components/PlatformLoginPanel.vue:9、:92 | 預填示範帳密與提示文案不一致，且線上沒有對應帳戶 | 清空預填值，刪除示範帳密提示，不建立相同預設帳號補洞 |
| 同檔 :18、:32、:50 | API rejection 未完整 try/catch/finally，可能留下 loading 或未處理例外 | 僅修 project-b 面板錯誤收尾，明確區分錯帳密、限流與網路錯誤 |
| src/router/guards.js＋面板 onMounted 還原 | guard 使用 Store，而 Session 還原是非同步掛載行為 | 測試直接進受保護網址、儲存殘留與過期 Token，不先重寫 World／共享 guard；必要調整先提出最小範圍 |
| project-b/modules/employee/components/EmployeeEditor.vue:17、:143 | 新增時收密碼但沒有 username 輸入；密碼為文字欄位且被 trim，更新時刪掉密碼 | M4-B／C 明確分開員工新增、帳號佈建與密碼重設；不能假裝目前表單已提供完整帳戶功能 |
| 舊 EmployeeController.php create | 只插入員工與通知，並不建立 users；接受外部 user_id；無已確認授權檢查 | 新 API 後端授權、關聯與交易必須重新驗證，不機械移植 |
| employee/services/employeeService.js | 直接 import notification 私有 Service，並未檢查 HTTP ok 即解包 | M4-C 依模組邊界處理通知缺席、錯誤不寫入成功 Store；不以員工 CRUD 為由先移植整個通知模組 |

以上為原始碼證據，不是本輪已修正。沒有實際登入帳戶，不能將 M3 合成 API Smoke 當成 M4 前端登入驗收。

## 4. 安全佈建方案（待確認後實作）

第一個帳戶建議使用受控本機 CLI，固定 project-b Staging 目標，透過既有 Cloudflare 管理權限執行；不新增 bootstrap HTTP endpoint、URL 密鑰、公開註冊或 GitHub 自動 seed。

- 真實 username／顯示名稱由使用者指定；密碼在執行時以隱藏輸入或安全 stdin 取得並確認，不放命令列參數、Git、SQL 檔、日誌、報告或對話。實作 CLI 前確認輸入管道不會回顯。
- 只存隨機 salt＋scrypt 編碼；錯誤不得輸出 CLI SQL 參數、明文或雜湊全文。不回傳可用憑證到報告。
- 第一個專案管理員建議 role=super_admin，但只在 project-b 有效，不授予 Cloudflare 或跨專案權限。真實建立前需確認此角色與帳號；不以舊 username 判斷特權。
- 伺服器／DB 原子檢查該 tenant 尚無管理員，已存在則拒絕，不把「先 SELECT 再 INSERT」視為並行安全；不以 upsert 覆寫既有帳戶或重設密碼。
- 本批先佈建 users 身份；員工表與 user_id 關聯於 M4-B 明確設計。users 的姓名、role、狀態維持身份權威，不讓員工表成為第二份未同步授權真相。
- 普通員工新增是否建立登入帳號不得隱含。M4-B／C 契約需指定明確操作、username／密碼規則、關聯唯一性與單批交易失敗回復，不能讓 client 任意傳 user_id 綁定別人。
- 沿用前端已有 super_admin／manager／staff 命名（employee/pages/list.vue:11、EmployeeEditor.vue:25）。各角色可管理誰、能否升降權與密碼重設，於 M4-B 確認；不能把 UI canManage 當成後端授權，也不預設 manager 可授予 super_admin。

待確認：真實帳號與顯示名稱、首位管理員角色、後續角色管理矩陣。不要在聊天中提供密碼；本輪不因使用者說「下一步」就建立真實帳號。

## 5. 後續驗收與分段

| 批次 | 最低驗證 |
|---|---|
| M4-A1 面板修正與本機測試 | 空預填值、成功／401／429／網路失敗、loading 收尾；只經 world.authApi |
| M4-A2 佈建工具 | 僅 project-b 允許目標、空庫建立、重跑拒絕、並行不重複／不覆寫、Secret 不回顯；使用合成資料先測 |
| M4-A3 前端流程 | 合成帳戶在授權環境登入、重整還原、深層網址、過期／停用、登出後舊 Token 無效；確認 dineCore 不受影響並清除合成資料 |
| M4-B | Employee Schema、users 關聯、角色矩陣、佈建／重設邊界；不匯入舊測試帳密 |
| M4-C～E | 帶後端權限的 Employee CRUD、Vue 串接與 project-b 自動部署 Gate |

本輪結果：來源契約已整理；上述測試僅為待執行清單，不是完成證據。下一步建議 M4-A1，先修正 project-b 登入面板並完成本機測試，暫不建立真實帳號、遠端寫入、Commit／Push 或部署。
