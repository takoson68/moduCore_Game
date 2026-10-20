---
status: active
updated: 2026-10-16
authority: work-state
---

# 當前工作

## 目前階段

2026-10-16 最新停止點：前端 ZIP 版本管理里程碑分析完成，FRONTEND_RELEASE_MILESTONE_PROPOSAL.md 已產出，EXECUTION_SPEC 加入明確標示為提案的 M4.1-A／B、M8-A／M9 對應及成本補充。來源為桌面 h5-dist-preview 實際 ZIP／release／current／previous 機制與目前 Workflow。僅更新文件，未改程式／Workflow、未 Commit／Push／部署。

唯一下一步：使用者確認是否優先做 M4.1-A（同次建置 ZIP＋manifest＋校驗＋短期 Artifact），及保留期（建議 7 天、須先量用量），再開始工程。M4.1-B 為下載包本機還原；M8-A 只讀版本列表；M9 控制／外部 ZIP 上傳另行確認。不新增 R2／付費服務，不把成品封存當線上發布或資料庫備份。既有 .env／AI 變更保留。以下為歷史停止點。

2026-10-16 最新停止點：使用者授權自行設定簡單測試帳密。已透過既有受控 CLI 在 project-b-staging 建立首位持久管理員；沿用最低 15 字元與 scrypt，不修改安全檢查。線上瀏覽器登入成功、員工管理載入成功（0 人），分頁保留供使用者操作。帳密只於本次交付提供，不記錄於文件或 Git。未建立對應員工資料，未在 dineCore 建帳戶。

使用者詢問 Git／專案切換：已實際比對本機與遠端 world-oop 同為 86810ff；程式在 /Users/zhangyu/Desktop/mytemp/moducore_platform 修改後推送。AI／治理文件、報告及既有 .env 仍未提交；不要聲稱所有檔案已同步。線上兩專案固定獨立入口，本機及建置由 VITE_PROJECT 選擇；尚無後台切換／新增專案入口管理功能。本輪不改程式、不再 Commit／Push／部署。下一步由使用者操作員工後台回饋，再確認後續範圍。

2026-10-16 最新停止點：使用者已允許 Commit／Push／兩站部署。M4 工程 86810ff 已推送 world-oop，CI 38863036522 全部成功，含兩站 Migration／部署／Auth 隔離及 project-b Employee Smoke（deleted）。新版本 project-b 7c13f778-0a2b-4c03-aed3-15f2bb4b8349、dineCore 048d3a62-540f-4cb9-a7ce-e7f0eccaebc9；舊站 2a42b8d1-62ae-4a53-b457-12d0f465c400 未變。兩新庫 Migration=4、users／tokens／employees=0、FK 無錯。報告 M4_E_DEPLOYMENT_RESULT.md。

唯一下一步：與使用者確認 project-b 首位真實管理員帳號／顯示名稱，密碼由使用者安全輸入、不貼對話；遠端建立需符合明確帳戶授權，不能用這次部署授權自行決定身份。M4 線上合成 Gate 已通過，但沒有可供本人使用的帳戶；不自動移植下一專案。工程已提交，.env、AI／治理文件與報告保留本機。保守歷史刪除及通知延後限制仍在；本輪未重演 rollback、帳單／日用量未確認。以下為歷史停止點。

2026-10-16 最新停止點：M4-E 發布準備完成，見 M4_E_RELEASE_PREPARATION.md。新增 Employee Smoke 契約／固定 project-b 遠端 runner，CI 接在 Auth 之後；共用契約在一次性 D1 通過，後端 43／43、最近前端 18 項合計 61。dineCore real build、兩站 Wrangler dry-run、diff check 通過。遠端 runner 未執行；無遠端寫入、Migration、Commit／Push 或部署。

唯一下一步：取得明確授權後，依工程白名單 Commit／Push world-oop，兩站 Staging 自動發布／0004／Auth 隔離與 project-b Employee 合成驗收。共用更動會發布 dineCore 與 project-b，兩庫皆新增空 Employee 表；舊站不在矩陣。發布前核對當下版本／資料／用量；保留 .env、AI／治理文件與報告，不全量 add。清理或 Smoke 失敗維持失敗，不宣告 G3。以下為歷史停止點。

2026-10-16 最新停止點：M4-D2 本機角色驗收完成。主管一般員工修改、角色選項限制、保護資料後端拒絕；本人電話更新、無關聯提示、API 故障／恢復重試、真正不同 user_id 換帳號隔離均經瀏覽器驗證。本人成功 alert 改頁面提示，Layout 清理鍵含 tenant／id／role，還原忙碌文案改處理中。60 項測試、real build、diff check 通過。報告 M4_D2_ROLE_RESULT.md；合成 fixture／帳戶僅本機，程序／分頁已關閉、DB 丟棄。未 Commit／Push／部署。

唯一下一步 M4-E 發布準備：核對所有 M4 未提交工程、隔離既有 .env／AI 文件、確認共用 0004 的兩目標影響，補 Employee 遠端 Smoke 與清理／回復計畫；取得明確發布授權後才 Commit／Push／Migration／部署。CI 現有 Auth Smoke 不等同 Employee 線上 Gate。保守歷史刪除限制與通知延後保留，G3 尚未通過。以下為歷史停止點。

2026-10-16 最新停止點：M4-D 核心畫面串接完成，管理員本機瀏覽器新增／修改／重整讀回／二次確認刪除／登出通過。移除密碼欄位與持久化、本人精確 user_id 關聯、HTTP 錯誤／重試、登出與換身份清理、延遲回應隔離、移除 notification 私有 import。60 項自動測試通過（42 後端＋11 登入＋3 傳輸＋4 員工服務／Store），real build 與 diff check 通過。詳見 M4_D_FRONTEND_RESULT.md。測試分頁、程序與一次性 DB 已關閉，沒有遠端改動、Commit／Push／部署。

唯一下一步：M4-D2 主管與一般員工完整瀏覽器矩陣、本人電話／無關聯／錯誤／換身份驗收。不可把管理員流程當成全部 UI Gate；仍未進入 M4-E。本人成功 alert 未驗收、歷史刪除精確限制仍在。既有 .env 與無關 AI 修改保留。以下為歷史停止點。

2026-10-16 最新停止點：使用者已同意 M4-C 角色與停用／刪除／通知規則，Worker Employee CRUD 本機完成。新增 src/employees.js、test/employees.test.js；註冊四條舊路徑，更新 Runtime 測試與本機工具模組清單。42／42 後端測試通過（含真實 Workers Runtime CRUD），git diff --check 通過；報告 M4_C_CRUD_RESULT.md。沒有遠端寫入、Commit／Push 或部署。

唯一下一步 M4-D：員工畫面串接、移除密碼持久化、本人精確關聯、錯誤呈現、跨模組私有 import 清理與登出資料清理，再做本機瀏覽器驗收。刪除在其他 project_b_* 業務表存在時保守全拒絕，非精確引用判定；ISSUE-20261016-005 追蹤。未動既有 .env／無關 AI 文件，以下為歷史停止點。

2026-10-16 最新停止點：使用者選 A（員工與登入帳戶分開）。M4-B1／B2 已本機完成：0004_project_b_employees.sql、test/employee-schema.test.js，Worker 35／35 測試通過；空庫／重跑、身份與 Token 保留、交易回復、FK／唯一約束及並行編號均已驗證。報告 M4_B_SCHEMA_RESULT.md。未建立遠端帳戶、未套遠端 Migration、未 Commit／Push／部署，前端既有修改保留。

唯一下一步：M4-C Employee CRUD。先確認主管管理範圍、刪除限制、員工狀態與登入狀態連動、通知延後等業務政策，不能把選 A 解讀為全部授權。Schema 的 role／status 僅員工資料，不直接授權或修改 users。共用 Migration 目錄發布前須核對各目標，避免忽略 dineCore 亦套用空表的影響。以下為歷史停止點。

2026-10-16 最新停止點：M4-B0 員工來源核對與執行草案完成，見 M4_B_EMPLOYEE_SPEC.md。已校正批次：正式規格 M4-B 是 Schema／Migration／fixture，M4-C 才是 CRUD。確認舊員工建立不建 users、密碼欄位無效、member_id 與 users.id 不同；本人查找回退可能更新錯誤 id，通知有跨模組私有 import。未改工程、未建 Migration 或遠端資料。

唯一下一步：請使用者確認「員工資料與登入帳戶分開、可無帳戶、不自動開通登入」或「新增員工同時建帳戶」。這會改變資料及對外行為，不能默默代決；確認後做 M4-B1／B2 本機 Schema 驗證。M4-C 的主管範圍、刪除與通知政策仍需確認。M4-A 未提交／部署，既有 .env／AI 修改保留。以下為歷史停止點。

2026-10-16 最新停止點：M4-A3 本機前端＋實際 Worker＋一次性 D1 整合驗收通過，涵蓋登入、深層網址重整、過期／停用返回公開頁及登出持久撤銷。修正 project-b/layout/LayoutRoot.vue 在 authStore 失去登入後仍保留受保護頁的問題，未改共享 Router／World。11 項前端、3 項 API、31 項後端測試及 real build 通過。報告 M4_A3_AUTH_E2E_RESULT.md；本機程序／分頁已關閉，一次性 DB 已丟棄。

唯一下一步以此為準：M4-B Employee 資料模型、角色／帳戶關聯契約與 CRUD 垂直切片。Employee API 尚未移植，空表不代表完成。M4-A1～A3 尚未 Commit／Push／部署；不得沿用 M3.1 授權。真實管理員資訊及遠端建立另待確認；本機驗收不等同 Staging Gate。既有 .env／AI 文件未覆蓋。以下皆保留為歷史停止點。

2026-10-16 最新停止點：M4-A2 受控 CLI 已本機完成，worker/scripts/provision-project-b-admin.mjs、project-b-provisioning.mjs、test/provisioning.test.js 與 package.json admin:project-b 指令新增；後端 31／31 通過，含原子首位管理員建立、並行僅一筆、重跑不覆寫、同名普通帳戶不升權、固定遠端目標 fetch 模擬、CLI stdin 安全及遠端確認防護。另 PTY 兩次合成密碼輸入無回顯，remote=false、一次性 DB 退出即丟棄。沒有真實／遠端帳戶、網路佈建、Migration、Commit／Push 或部署。報告 M4_A2_PROVISIONING_RESULT.md。

唯一下一步以此為準：M4-A3 本機合成帳戶的前端＋Worker＋D1 整合驗收，實際登入、重整還原、深層路由、過期／停用與登出撤銷。不得把目前函式／API Smoke 視為前端 Gate 已通過；真實帳號、名稱、專案管理角色與遠端建立仍待確認，密碼不可貼對話。M4-A1 變更與本輪 CLI 仍未提交，既有 .env／AI 文件未覆蓋。

2026-10-16 最新停止點：M4-A1 project-b 登入面板已本機修正：空帳密、無示範提示、登入／還原／登出例外收尾、安全錯誤訊息與 loading／密碼清理；10 項面板邏輯、3 項 API 測試與 project-b real build 通過，本機瀏覽器確認初始畫面。新增 frontend/scripts/test-project-b-auth.mjs、package.json 測試指令與 Workflow project-b 測試步驟，尚未 Commit／Push／部署。未建立帳號，既有 .env 未修改；詳見 M4_A1_LOGIN_PANEL_RESULT.md。

唯一下一步以此為準：M4-A2 受控 project-b 帳戶佈建 CLI，先做本機合成資料與安全輸入／原子性／重跑拒絕測試；不直接建立真實帳號或部署。真實帳號與角色仍待確認、密碼不得貼對話。M4-A 整體 Gate 未完成；以下來源核對與 M3.1 為歷史證據。

2026-10-16 最新停止點：已開始 M4-A，來源核對與建議佈建契約見 M4_A_AUTH_PROVISIONING_CONTRACT.md。確認實際入口為 project-b ProjectTopbar → project-b/components/PlatformLoginPanel.vue → world.authApi；不是共享 LoginModal。面板預填示範帳密／提示不一致且 rejection 收尾不完整，已記錄 ISSUE-20261016-002。員工表單收密碼但無 username、舊 API 不建 users，帳戶佈建不可假設已完成。

本輪只更新文件，不建帳戶、不修改程式、不 Commit／Push／部署。建議下一步 M4-A1：修 project-b 登入面板、清除示範預填與提示、補錯誤／loading 收尾並完成本機測試；之後才做受控 CLI 佈建與合成前端驗收。真實帳號／角色仍待指定，密碼不得貼入對話。以下 M3.1 完成證據保留；先前「M4 尚未開始」現應解讀為 M4-A 來源核對已開始，其餘實作未開始。

2026-10-16 最新：M3.1 固定入口與隔離自動部署已驗收。使用者允許 Commit／Push，工程 3aa2f58 已推送 world-oop；CI 38856141952 的 dinecore-staging／project-b-staging 皆成功。刻意失敗 CI 38856271678 依預期在 Migration／部署前停止，三站版本與 DB 檢查前後一致，不是線上故障。以下 M3 與手動版本皆為歷史恢復點；最新停止點以本段為準。

線上 dineCore：https://dinecore-staging.takoson68.workers.dev/，版本 cf5ee141-9ed6-422d-8b08-7ba7128be32d；project-b：https://project-b-staging.takoson68.workers.dev/，版本 cd48490c-e0db-4f3c-a4b9-ccb70cd91eef。舊站版本 2a42b8d1-62ae-4a53-b457-12d0f465c400 未變。三庫最終 users／Token 皆 0、Migration 三筆、FK 無錯。詳見 M3_1_B_D_RESULT.md。

**唯一下一步：與使用者確認開始 M4 project-b 帳戶佈建／Employee 垂直切片，先固定來源契約再實作；本輪停止，不自動延伸業務功能。** M0 Recovery Codes 與當日用量／帳單再驗證仍待確認。工程已提交；既有 AI 文件、frontend/.env、工作紀錄與報告未混入提交。

moduCore 的 M1、M3／G2 已驗收。M3 遠端 PBKDF2 上限已定位，改用 scrypt 安全參數並新增 0003，20 項後端測試、3 項前端傳輸驗證、5 專案 Build、遠端 Auth 與 Worker 回復／恢復均通過。最新 CI 38710616816 全數成功；M4 尚未開始，其餘業務 API 未移植。Recovery Codes 保存仍待確認。

## 已確認方向

- 保留 moduCore 前端 World、Container、Module、Store、Router 與 UI Slot 架構。
- 前端目標為 Cloudflare Static Assets。
- 後端完整替換為 Cloudflare Workers JavaScript。
- 資料庫改為 Cloudflare D1／SQLite。
- 每個 Project 原則上獨立 Worker，資料型專案使用獨立 D1。
- 2026-10-15 已確認：各專案應有固定網址／子網域並同時存在，不再輪流替換同一測試站。規格新增 M3.1 固定入口與隔離 CI、M8-A 唯讀管理後台、M9 控制操作候選；尚未實作或授權新建資源。
- 不預先導入 Express、Hono、ORM、Repository 或微服務。

## M0 環境檢查

- Cloudflare 帳號：已在正確的 Chrome `yu` 設定檔中進入 Dashboard；帳號 Email 已驗證，為 `takoson68@gmail.com`。
- GitHub Repository：`origin` 已確認指向 `https://github.com/takoson68/moducore_platform.git`。
- Branch 連線：目前 `world-oop` 正常追蹤 `origin/world-oop`。
- GitHub 帳號：已在同一個 Chrome `yu` 設定檔中登入；頁面確認目前帳號擁有 `takoson68/moducore_platform`。
- Cloudflare／GitHub 身分：Cloudflare 使用 `takoson68@gmail.com`，GitHub 使用者為 `takoson68`，帳號身分一致；未以登出重登入方式破壞性重測 OAuth Callback。
- Cloudflare 2FA：電子郵件雙因素認證已啟用；Recovery Codes 尚待使用者保存確認。
- Cloudflare 方案：使用者確認目前維持 Free Plan。
- Cloudflare API Token：`moducore-github-actions-staging` 已建立且 Dashboard 顯示啟用；權限限於單一帳戶的 Workers 指令碼編輯與 D1 編輯。Token 曾由使用者貼入對話，使用者已知悉並決定保留供測試使用。
- GitHub Secrets：兩項 Secret 已由成功 CI 驗證可用；Token 曾有 Authorization 格式錯誤，使用者更新後已排除。
- Repository 憑證檢查：未找到 Cloudflare Token；只找到既有文件內的一般 `Authorization: Bearer` 範例。
- GitHub Actions、Worker 與 D1：已建立，部署網址為 https://moducore-staging.takoson68.workers.dev 。
- `workers.dev`：依 Cloudflare 現行機制，每個 Worker 建立時自動取得路由，實際 URL 改由 M1 驗證，不再要求 M0 先建立不存在的 Worker。

## 已完成

- 完成專案架構與 Cloudflare 相容性分析。
- 驗證 project-a、project-b、dineCore、flowCenter、modudesk 均可完成 Production Build。
- 產出簡短報告與執行規格書。
- 參考 `h5-basic-style`，建立 `_ai-context/` AI 操作層，補強通用入口、最小導讀、工程摘要、工作流程、Git、語言、資料分流與恢復點。

## 相關文件

- `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/README.md`
- `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/EXECUTION_SPEC.md`
- `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/M3_RESULT.md`
- `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/M3_AUTH_CONTRACT.md`
- `_workspace/_reports/2026-10-15_AI工作機制比對與升級報告.md`

## 工作樹注意事項

- `platform/frontend/.env` 在本輪開始前已有使用者修改，不得覆蓋或納入其他變更。
- 使用者已解除分析限制並授權 M1；新增 Worker、Workflow 與 Cloudflare 建置模式。

## 下一步

2026-10-16 最新停止點：使用者已授權「保留舊站舊庫＋建立兩個新入口與獨立 D1，部署及隔離驗證」。已建立並部署 dinecore-staging（D1 10230112-5e9d-4ed7-ad17-d836896e64b1、版本 a72871b0-22b2-4f84-b419-fb13760c6f31）與 project-b-staging（D1 d446407c-6c4b-4746-b0fb-7368d850986c、版本 fe975fd2-3720-4f82-ac4c-b58e56869af2）。舊站與舊庫保留，舊版本 2a42b8d1-62ae-4a53-b457-12d0f465c400 未變。22 項後端、3 項前端測試通過；兩站 real build、dry-run、遠端 Auth、真正跨網址 Token／D1 隔離、dineCore 更新／回復不影響 project-b 或舊站、刻意失敗 dry-run 不改遠端版本均已驗證。三庫最終 users／tokens 皆 0、外鍵無錯。詳細見 M3_1_B_D_RESULT.md。

本輪工程尚未 Commit／Push：新增兩個 Wrangler JSON、scripts/deployment-targets.mjs、scripts/smoke-isolation-rollback.mjs、部署設定測試；修改 Worker health 服務標記、smoke 目標化、.gitignore 及多目標 Workflow。後者目前只在本機，GitHub 仍發布舊站。使用者既有 frontend/.env 與 AI 文件不得混入工程提交。

本段手動部署後的停止點已被上方最新狀態取代：使用者已允許 Commit／Push，多目標 CI 及安全失敗演練均已通過。M4／M6 業務 API 尚未移植；dineCore 首頁可能顯示無法建立點餐身份。合計 3 Worker／3 D1，未變更付費方案；實際用量／帳單仍未再驗證。

追加任務已完成：Staging 已從 project-a 切換為 dineCore，使用者明確允許 Commit／Push／自動部署。提交 e954ab9、73b72bc 已推送 world-oop；CI 38712004231 全數成功，線上版本 2a42b8d1-62ae-4a53-b457-12d0f465c400。瀏覽器確認「桌邊點餐」首頁，dineCore Session 200、project-a 403，完整遠端 Auth 通過且合成帳戶已清除。Cloudflare build／CI／Worker／Auth smoke 專案識別同步。保留本機 .env，線上仍為 real API；dineCore 業務 API 尚未移植，不能宣稱點餐或營運已完成。GitHub 預設分支為 world-oop。詳見 STAGING_DINECORE_RESULT.md；下列 M3 線上版本為歷史證據，最新以本段為準。

2026-10-16 本輪已執行 M3.1-A 唯讀盤點，文件 M3_1_A_DEPLOYMENT_INVENTORY.md 已產出、待驗收。Cloudflare Worker 清單為 1 個 moducore-staging；直接 D1 API 清單為 1 個 moducore-staging-db、69632 bytes。SQL 管理查詢失敗 7500 SQLITE_AUTH；wrangler d1 list 失敗 10000，但直接清單成功，不可推論無 DB。公開首頁／health／dineCore Session 正常、project-b 403。帳單 API 403、當日用量未知；standard usage model 不代表 Free 方案證明。沒有建立資源、Migration、寫入測試、Commit、Push 或部署。

後續診斷已完成：SQLITE_AUTH 可由 PRAGMA page_count 單獨重現；一般 SQL、page_size 與 Wrangler d1 list 重測成功，不需要擴權或重新登入。已確認三筆 Migration，users=0、user_tokens=0，所有查詢 rows_written=0；原先 list 10000 暫時失敗原因未定。報告已更正，ISSUE-20261016-001 移至 RESOLVED_ISSUES。

唯一下一步：請使用者驗收 M3.1-A，確認「保留舊站舊庫＋新增 dinecore-staging／project-b-staging 與兩新庫」方案；方案／當日額度仍待確認，再取得 M3.1-B～D 建立、發布授權。此方案合計 3 Worker／3 D1，未實際建立。本輪沒有擴權、重登入、建立或部署。M4 的 Staging 不再覆蓋 dineCore，業務移植順序仍為 M4～M7。最新線上版本以上段追加任務為準。

使用者確認舊 MySQL 只有測試資料可重建，不授權刪除舊庫。舊 PHP 執行環境不可用只記為比對限制，不再作為 M3 阻擋條件。其餘路由依 M4～M7 逐批固定契約、實作並測試。

Migration 現況：遠端 0001、0002_auth.sql、0003_scrypt_credentials.sql 均已套用；外鍵無錯、驗收帳戶已清除。Worker 回復不撤銷 D1 Schema，不修改已套用的 Migration。舊 PHP／MySQL 未刪除。

已完成首次 Staging 部署：https://moducore-staging.takoson68.workers.dev 。首次手動版本為 `1434863c-9f5e-44cf-80cb-ebf1da86db29`，之後另有成功 CI 發布，最新遠端版本須由部署紀錄確認。M1 遠端首頁與 `/about` 回傳 HTML 200，`/api/health` 回傳 database=ok，未知 API 回傳 JSON 404。

GitHub CLI 已登入 takoson68 並經使用者允許新增 workflow 權限。`7cc9e65` 與 `f042cf5` 已 Push 至 origin/world-oop，既有 AI 文件與 `.env` 未納入。

CI https://github.com/takoson68/moducore_platform/actions/runs/38692452088 在 Secret 更新後重跑成功，包含 migration、部署與公開 HTTP smoke。安全演練 https://github.com/takoson68/moducore_platform/actions/runs/38692842610 按預期在 Simulate safe staging failure 退出，migration 與部署均跳過；該次紅色狀態是刻意測試。

