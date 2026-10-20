# M4-A2 受控帳戶佈建工具（本機驗證）

2026-10-16：工具與本機測試完成；沒有遠端建立帳戶、Migration、部署、Commit 或 Push。整個 M4-A 尚未通過前端完整流程 Gate。

## 實作

- `platform/worker/scripts/provision-project-b-admin.mjs`：預設使用隔離、不持久化的 Miniflare D1，套用既有 Migration 後驗證一次建立，退出即丟棄帳戶。不是建立可用的本機或線上登入帳號。
- `scripts/project-b-provisioning.mjs`：固定 project-b tenant／Staging DB，以單條 `INSERT ... SELECT ... WHERE NOT EXISTS ... RETURNING` 原子建立首位 super_admin。已存在任何此 tenant 的 super_admin（包含停用）即拒絕；同名普通帳戶不覆寫或升權，沒有 upsert 或 MAX+1。
- `test/provisioning.test.js`：使用真實本機 D1，及無網路的 fetch 模擬／CLI 子程序。測試不改動既有 Wrangler 本機或遠端 DB。
- `package.json`：新增 `admin:project-b`；未改相依套件或公開 API。沒有新增 Seed、預設帳號、Migration 或角色管理後台。

## 憑證與遠端防護

- 帳號／名稱是明確參數，無預設值；帳號 trim／小寫，限 1～50 字元的英數及 `._@+-`。姓名 1～100 字元、不含控制字元。
- 新管理員密碼目前採工具的保守限制：至少 15 個 Unicode 字元、JS 長度最多 256，不允許空白全字串、換行或 NUL，不修剪內容；須輸入兩次相同。此為佈建限制，不回頭改 M3 既有帳戶登入條件。
- 密碼只讀 TTY 隱藏輸入或 stdin 兩行；不接受密碼 CLI 參數／密碼環境變數／檔案參數，不列印密碼、hash、Token 或原始 SQL 例外。不要把真實密碼寫在 shell 指令或聊天中。
- 遠端功能需 `--remote --confirm-target project-b-staging`，固定 Cloudflare Account／DB，及既有 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`。憑證值只在程序內使用，不寫入檔案；不自動擴權、重登入或讀取 GitHub Secrets。
- 遠端透過 HTTPS API body 的 SQL／params 傳輸雜湊，不把 SQL 或 hash 放在子程序 argv 或暫存檔。輸出只有安全結果／錯誤碼。
- 遠端分支只做模擬測試；尚未驗證真實權限或建立請求。CLI flags 是防誤操作，不是取代使用者授權。真實執行前仍須確認帳號、名稱、project-b 專案管理角色及明確遠端建立授權，密碼不在對話提供。

## 驗證結果

- `npm test`：31／31 通過，其中佈建新增 8 項。
- 首次雜湊儲存、保留密碼空白、重跑拒絕、停用管理員防繞過、並行僅成功一次、同名普通帳戶不可升權及其他 tenant 不被修改。
- 拒絕不合法身份、短密碼／確認不符；API 固定目標、錯誤不洩漏憑證；真實 CLI 子程序預設本機、stdin 與 hash 不回顯、拒絕密碼參數／任意目標／缺遠端確認或憑證。
- 另以 PTY 手動執行本機一次性測試，兩次輸入合成密碼皆無回顯，結果 remote=false、退出成功。非持久帳戶，沒有可供登入的帳密。
- `git diff --check` 通過。未聲稱遠端 bootstrap 或瀏覽器登入已驗收。

本機操作（帳號與名稱需自行指定；密碼在提示中輸入）：

```sh
cd /Users/zhangyu/Desktop/mytemp/moducore_platform/platform/worker
npm run admin:project-b -- --username <合成本機帳號> --name <合成顯示名稱>
```

## 下一步

M4-A3：以本機合成帳戶完成前端＋Worker＋D1 整合驗收，包括實際登入、重整還原、受保護深層路由、過期／停用與登出撤銷。這與函式測試、既有遠端 Auth Smoke 是不同 Gate。優先本機測試，不因此自動建立真實帳戶或部署。
