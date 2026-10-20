# M3 新 JavaScript 後端 Auth 契約

日期：2026-10-15。範圍：login、session、restore-session、logout、Tenant 與角色驗證。舊 PHP 僅作來源參考，新 Workers＋D1 測試是驗收依據。

## 來源與新落點

- 舊行為：`platform/backend/src/Controllers/AuthController.php` 的 login／logout／session；`platform/frontend/src/app/api/index.js` 的 authApi；`_VibeCore/engineering/IDENTITY_ACCESS_CONTRACT.md` 的身份欄位。
- 新實作：`platform/worker/src/index.js`、`auth.js`、`credentials.js`、`response.js`。
- D1：`platform/worker/migrations/0002_auth.sql`、`0003_scrypt_credentials.sql`。
- 可執行契約測試：`platform/worker/test/auth.test.js`，使用隔離的實際 Workers Runtime 與本機 D1，不用 SQL mock。

## 路由

| Method／Path | 輸入 | 成功回應 | 重要錯誤 |
|---|---|---|---|
| POST /api/login | X-Project；JSON username、password | 200 `{success:true,user,token}` | 缺欄位 400、錯誤帳密或停用 401、專案不符 403、超過大小 413、非 JSON 415、頻率限制 429 |
| GET /api/session | X-Project；可選 Authorization Bearer | 200 `{success:true,authenticated,user,token}` | 缺專案 400、專案不符 403、Query Token 400、Header 格式錯誤 400 |
| GET /api/restore-session | 同 session，舊路由別名 | 同 session | 同 session |
| POST /api/logout | X-Project；可選 Authorization Bearer | 200 `{success:true}`，無 Token 或已撤銷仍成功 | 缺專案 400、專案不符 403、Query Token 400 |

Session 無 Token、未知／到期／撤銷 Token 或帳戶停用時，沿用匿名成功回應：`authenticated:false,user:null,token:null`；業務用 `requireSession()` 將相同情境轉為 401。角色白名單不符回傳 403。所有 Auth 查詢及撤銷皆固定使用環境設定的 tenant，不接受 Header 改選資料庫或專案。

user 欄位：id（整數）、tenant_id、username、name、role、company_id（字串）、is_super_admin（布林）。M3 的安全身份真相在 users；未來 Employee CRUD 不可另外維護不一致的角色真相。

HTTP 錯誤使用 `{success:false,ok:false,message,error:{code,message},traceId}`；Trace ID 也放在 `X-Trace-ID`。未知例外固定為 500 INTERNAL_ERROR，log 只記錄 traceId／安全錯誤碼，不回傳 SQL、堆疊或路徑。所有 JSON 回應 no-store。

## 明確的安全行為變更

- PROJECT_ID 固定於部署設定。目前 Staging 前端為 project-a，因此設定 project-a；M4 的 project-b Pilot 必須將前後端一同明確設定 project-b。缺少 Worker 設定時 Auth 回傳 503，不自行推斷。
- username 去首尾空白並轉小寫，上限 50 字元；password 不做 trim，上限 256 字元。JSON 物件上限 4096 bytes。這取代舊 PHP 對密碼 trim 的行為。
- 新密碼採 scrypt，N=16384、r=8、p=5，16-byte 隨機 salt、32-byte 輸出；格式為 `scrypt$16384$8$5$saltHex$hashHex`，只允許固定成本。參數來自 [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) 的基準組合。
- 原 PBKDF2-SHA256 600000 次已在遠端預覽以非憑證固定向量確認被拒絕：`NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000).` Web Crypto 與 Node.js crypto 相同；100000 次控制組成功。本機 workerd 並未重現限制。不能把參數降低為 100000。
- 舊 PBKDF2 編碼原樣保留，驗證支援只在 Runtime 允許時有效；遠端仍會安全回應 503，不會將其當成 scrypt 或明文。已確認目前 Staging 沒有要保留的真實帳戶；若其他環境有舊編碼，必須另外安排安全的密碼重設，不可直接轉換未知明文。
- Token 採 32-byte 隨機值，回傳 64 字元 hex；D1 只存 SHA-256 雜湊。有效期 8 小時，登出寫 revoked_at。未知帳戶仍執行密碼 KDF。
- 拒絕 URL query token；前端共用 apiRequest 只傳既有 Authorization Header。專案模組殘留的 tokenQuery 選項目前被忽略，隨各專案移植清理，無需同時重構所有模組。
- 登入前以 D1 原子計數限制：每 username 每 15 分鐘 10 次、每 IP 50 次（含成功）。CF-Connecting-IP 僅在 Cloudflare 邊緣視為來源，隔離測試使用 local。限制紀錄只保留約一天。

## Migration 與回復

0002 只新增 users、user_tokens、auth_login_limits 及索引，不匯入資料、不刪除 0001。外鍵以 tenant＋user_id 約束，不允許 Token 跨 tenant 指向使用者；日期採 UTC Unix seconds，未來業務日期顯示另外轉台灣時間。

Migration 首次套用與重跑已本機驗證；D1 batch 約束失敗及 DDL 失敗時整批回復均有測試。不要手動重跑 CREATE TABLE，應使用 Wrangler migration 記錄。

0003 為 SQLite CHECK 格式擴充，於 Migration 交易內先複製 users 與 user_tokens，再替換原表；ID、所有欄位與 Token 均保留，外鍵與索引重建。已用帶既有帳戶和 Token 的 D1 測試成功保存、跨 Tenant 拒絕、刪帳戶連帶撤銷及中途失敗整批回復。不可修改已套用的 0002。舊 M1 忽略新增表，仍可回復；舊 M3 PBKDF2-only 版本無法驗證新 scrypt 密碼，不列為可用回復目標。

Worker Rollback 與 D1 回復分開：新版本有問題時回復已知 Worker 版本，保留此向後相容的新增資料表；不要刪表配合舊 Worker。需要復原資料時才依 D1 Bookmark／Time Travel 另外處理，先評估新寫入資料損失。已實際回復 M1 `6d338427-0905-4db6-ae63-a1b79ce22a8b`，再恢復 scrypt 版本 `f3210c05-759f-4cd5-a726-ce7f4381579e` 並通過完整遠端 Auth；遠端三筆 Migration 仍保留、外鍵檢查無錯、合成帳戶數為零。此為 Worker 回復驗證，不是 D1 Time Travel 資料復原演練。

目前未提供註冊或公開 seed 端點；測試帳密只在測試程序隨機產生，真實帳戶佈建屬 M4。未完成 Employee CRUD、前端實際登入 UI 與其他業務 API。

技術依據：[Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)、[D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)。
