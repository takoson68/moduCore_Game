# M3 實作與 Staging 驗證結果

2026-10-15：M3／G2 通過。已修正遠端密碼運算限制，完成 Staging 登入與 Session 驗收、Worker 回復與恢復，CI 全數成功；維持 Free Plan。

- 原生 Route Table、JSON 錯誤處理、Trace ID、固定 Tenant。
- login／session／restore-session／logout；密碼及 Token 只存雜湊，Session 8 小時到期；角色 helper 與持久登入頻率限制。
- 新增 SQLite Migration：users、user_tokens、auth_login_limits；不匯入舊測試資料。
- 前端共用 API 改用 Header 傳遞 Token；World、Container 與模組生命週期未更動。
- Cloudflare build 改用跨平台 Node 腳本，預設 project-a，不受本機 .env 的 VITE_PROJECT 影響。

## 驗證

| 項目 | 結果 |
|---|---|
| Worker／Auth／D1 測試 | 20／20 通過；包含實際 Workers Runtime＋隔離 D1、scrypt 參考向量 |
| 前端 Token 傳輸測試 | 3／3 通過；Session、還原、舊 tokenQuery 呼叫皆只用 Header |
| 空白 D1 Migration | 0001～0003 套用成功；CI 重跑無需套用 |
| Migration／交易失敗 | 帳戶與 Token 全欄位保留、FK 檢查、DDL 失敗整批回復通過 |
| 五專案前端 Build | project-a、project-b、flowCenter、dineCore、modudesk 全數成功 |
| Wrangler dry-run | 成功，辨識 DB／ASSETS／PROJECT_ID |

## 停止點

最新 Commit `773186e`（前一修正 `ebaeee4`），[CI 38710616816](https://github.com/takoson68/moducore_platform/actions/runs/38710616816) 全數成功，已包含正向遠端 Auth Gate。線上版本 `127e3876-22d4-4eea-8094-fc6e04332549`。

根因已實測確認：遠端 Web Crypto 與 Node.js crypto 都拒絕 PBKDF2 超過 100000 次，本機無此限制。改為 OWASP 基準 scrypt N=16384、r=8、p=5，未將 PBKDF2 降級。0003 擴充雜湊格式、保留身份與 Session。初次 CI 在部署後立刻讀到舊版 404，加入最多 60 秒的無憑證就緒等待後重跑成功，不重試登入寫入。

遠端登入、Token 雜湊／8 小時期限、Session／還原、跨專案拒絕、Query Token 拒絕、錯誤帳密及安全錯誤、到期與登出持久撤銷全部通過。每次結束清除自己的合成帳戶與 Token。首頁、SPA、D1 health 正常，外鍵檢查無錯。CI 登入約 761 ms 是含網路時間，不是 CPU 用量。

已實際切回 M1 `6d338427-0905-4db6-ae63-a1b79ce22a8b`，驗證首頁／SPA／D1 200；再恢復 scrypt `f3210c05-759f-4cd5-a726-ce7f4381579e` 並通過完整 Auth，之後由最新 CI 發布。三筆 D1 Migration 保留，沒有刪除資料庫或改寫已套用的 Migration；不是 Time Travel 資料復原演練。Free Plan 小流量驗證成功，尚無 CPU 百分位與負載測試數據，不能保證任意並行量。

目前沒有公開註冊／seed 端點、預設帳密或 Employee CRUD。M4 才加入 project-b 使用者佈建、員工功能與前端登入驗收。詳細介面與安全行為變更見 [M3_AUTH_CONTRACT.md](M3_AUTH_CONTRACT.md)。

M2 已依使用者確認改為逐批來源契約＋新後端測試，不強制安裝舊 PHP／MySQL。其餘業務 API 的待確認項目保留於 m2，不宣稱已完成。

設計邊界檢查：本次只調整 Worker 後端、必要的前端 API 傳輸與建置／CI；沒有新增框架、ORM、Repository、Service Layer，也沒有修改 World／Container／Module 的責任與資料流。
