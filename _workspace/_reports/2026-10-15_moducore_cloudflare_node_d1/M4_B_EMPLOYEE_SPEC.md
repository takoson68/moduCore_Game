# M4-B 員工資料與帳戶關聯執行規格

日期：2026-10-16。狀態：來源核對完成、方案待確認；未建立 Migration、業務 API 或遠端資料。本文件是本次執行草案，不是新的平台治理規則。

最新：使用者已確認 A（員工與登入帳戶分開）。M4-B1／B2 Schema 與一次性測試已完成，35 項後端測試通過，見 [資料表結果](M4_B_SCHEMA_RESULT.md)。上方及下方「未建表」為原始草案狀態；M4-C 授權／刪除／通知等建議仍未確認，未實作業務 API 或部署。

## 1. 簡短結論

員工資料與登入帳戶目前是分開的，舊畫面的密碼欄位不代表可以建立帳戶。建議保留此分界：先完成員工資料管理，登入帳戶另由受控流程建立或連結。不要讓一般「修改員工」直接變更登入權限。

M4-B 只處理 Schema／Migration／測試資料；M4-C 處理 CRUD，M4-D 處理畫面。先前摘要稱 M4-B 包含 CRUD 不精確，以 EXECUTION_SPEC.md 第 13.5 節原分段為準。

## 2. 實際程式證據

| 來源檔案 | 已確認現況／影響 |
|---|---|
| `platform/frontend/projects/project-b/modules/employee/api/employeeApi.js` | 四條 `/api/employees/*`；mock 儲存並回傳 password |
| `platform/frontend/projects/project-b/modules/employee/components/EmployeeEditor.vue` | 姓名／Email 必填；角色 staff／manager；新增收明碼示範密碼，卻沒有 username；修改不送 password |
| `platform/frontend/projects/project-b/modules/employee/pages/list.vue` | 管理者看清單；staff 看個人資料；以 email／username 猜測本人，失敗回退 auth user；更新可能把 users.id 當員工 id，並送 password |
| `platform/frontend/projects/project-b/modules/employee/store.js`、`services/employeeService.js` | 模組 Store 保存清單；normalize 帶 password；服務直接 import notification 私有服務；非預期清單回應可被轉成空表 |
| `platform/backend/src/Controllers/EmployeeController.php` | API id 是 member_id，不是內部主鍵或 users.id；新建只寫員工與通知，不建立 users、不處理 password；未見後端角色驗證；MAX(member_id)+1 有競態 |
| `platform/backend/api/project-b/employee/tables.sql` | 內部 id、member_id、nullable user_id；員工 role／status 與 users 重複；唯一鍵為 member_id＋email，未保證 member_id 單獨唯一 |
| `platform/backend/api/project-b/task/tables.sql` | 任務與參與人員使用 member_id；不可直接把員工 id 換成登入帳戶 id |
| `platform/worker/migrations/0003_scrypt_credentials.sql` | users 已有 tenant＋id 複合唯一鍵；身份 role／name／status 屬 Auth 資料；Token 參照同 tenant user |
| `platform/worker/src/index.js` | 尚無 Employee 路由，現況回傳 404；空畫面不是 CRUD 通過 |

舊 controller 以 `project_b` JOIN users，新部署固定 tenant 為 `project-b`；新端不得照抄舊字串。未執行舊 PHP／MySQL，以上為靜態來源核對，不宣稱新舊端到端等價。

## 3. 建議資料契約（待確認）

- 表名沿用 `project_b_employees`；`member_id INTEGER PRIMARY KEY AUTOINCREMENT` 作為員工識別，回應 `id = member_id`。不另存無消費者使用的內部 id，不使用 MAX+1。既有資料只有測試資料可重建，但不刪舊庫。
- `tenant_id` 固定由伺服器給 `project-b`；每次讀寫限縮 tenant，不接受 body 選 tenant。
- `user_id` 可空；非空時同 tenant 一對一關聯 users，使用複合 FK 與 UNIQUE(tenant_id,user_id)，刪 users 採 RESTRICT，避免隱性刪員工歷史。
- 姓名、職稱、部門、Email、電話保留；長度上限分別 64／64／64／255／32，姓名及 Email 不可空。Email 不自動作為帳號，也不任意新增唯一限制。
- `status` 沿用 active／inactive，只代表員工資料狀態，不默默等同停用登入帳戶。
- `role` 暫保留 staff／manager／super_admin 作員工資料欄位，以相容目前畫面；不作 API 授權來源，不回寫 users.role。畫面應明確區分員工職能與登入權限，否則不可直接開放編輯。
- created_at／updated_at 使用整數時間；更新時間由後端寫入，不接受客戶端指定。
- 回應保留 id、member_id、user_id 與既有資料欄位；username、user_status 由 users 安全 JOIN 投影。永不回傳 password、password_hash、Token；無綁定時 username 空字串、user_status null。

姓名可能與 users.name 不同，前者為員工姓名、後者為登入顯示名稱；M4-B 不自動同步。需要合併姓名／角色／狀態真相來源屬另一選項，不能默默採用。

## 4. 後續 CRUD 與安全邊界草案

保留既有 GET list、POST create／update／delete 路徑；list 為陣列、create／update 為物件、delete 為 success。所有端點沿用 Bearer、X-Project、Trace ID 與安全錯誤格式。

| 身份 | 建議範圍（尚待確認） |
|---|---|
| 未登入／跨專案 | 拒絕，不回傳員工資料 |
| super_admin | 限當前 project；管理員工資料；綁定帳戶另經受控操作，不開放任意 user_id 注入 |
| manager | 查看清單，新增／修改一般 staff 員工資料；不能操作 super_admin、不能提升管理權限或變更登入資訊 |
| staff | 以 Session user_id 精確查自身關聯，只回傳本人；僅修改本人電話，不接受 role／status／user_id／password |

禁止用姓名、Email、username 模糊比對授權。沒有員工關聯時呈現「尚未建立員工資料」，不得以 users.id 回退更新。一般更新不接受密碼，畫面移除無效密碼欄位；未支援的敏感欄位明確拒絕，不能假裝已更新。

刪除僅建議允許 super_admin 刪除無帳戶關聯、無業務引用的員工；有引用回 409，提供停用替代，不串刪 users／Token。角色不足 403、不可見或不存在 404、欄位錯誤 400、關聯衝突 409。帳戶停用與重設密碼不放入一般 Employee CRUD。

通知是已存在的舊副作用：不能只因通知尚未移植就宣稱建立員工完全等價。M4-C 前需選擇一併實作最小通知交易，或明確接受延後通知；不建通用事件框架，也不擴寫 PHP。

## 5. 分段、交付物與 Gate

| 批次 | 工作／交付物 | 通過條件 |
|---|---|---|
| M4-B0 本輪 | 來源核對與本規格 | 身份／欄位差異已列出，重要政策取得確認後才建表 |
| M4-B1 | 新增 0004 Employee Migration（候選檔名） | 空庫依序套用 0001～0004；不改已套用 Migration；既有 users／Token 保留 |
| M4-B2 | 一次性合成測試 fixture，不加正式預設 seed | 重跑遷移流程不重套；並行 ID 不衝突；跨 tenant FK、重複綁定、非法 status／role／長度拒絕；失敗整批回復，外鍵檢查通過 |
| M4-C | Worker CRUD＋後端授權測試 | 管理者／主管／本人、跨 tenant、ID 混淆、欄位注入、找不到資料、引用刪除、交易失敗驗證 |
| M4-D | 模組內 API／Service／Store／畫面最小串接 | 移除密碼持久化；本人用 user_id 關聯；API 錯誤不能變成成功空表；修正通知私有 import；登出清理敏感模組資料；real build／瀏覽器驗收 |
| M4-E | 取得另行發布授權後 Staging | 自動部署、Migration、Smoke、回復；不能拿本機測試代替線上 Gate |

Migration 只新增表，不破壞 0001～0003；Worker 回復不回退 Schema。若 Migration 失敗，禁止繼續部署。首位登入管理員沿用受控佈建，不混入 Employee fixture；Production／Staging 不寫公開測試帳密。

## 6. 成本、範圍與本輪驗證

維持每月 NT$100 上限與 Free Plan，不新增 Worker／D1、不新增付費服務。測試只用本機一次性 DB；線上查詢需索引、列表需另訂上限／分頁，不宣稱當日額度或帳單已驗證。現有小清單陣列契約若增加分頁，應先列相容策略再修改。

本輪只修改規格與工作紀錄，已核對相關檔案及執行規格分段；未修改工程程式，未執行新增 Schema／API 測試，未 Commit／Push／部署。設計偏離檢查：維持 World、Container、單一 authStore 與 Employee 模組資料邊界；未引入 ORM、Repository、服務框架或微服務。

## 7. 實作前待確認

建議採「員工資料與登入帳戶分開、允許無帳戶員工、建立員工不自動開通登入」；員工 role／status 不自動更改登入權限，帳戶連結另走受控流程。若希望每次新增員工就能設定帳密登入，需改成帳戶＋員工原子建立，補 username、角色及撤銷政策，不能沿用目前畫面。

主管管理範圍、刪除限制與通知延後，亦須在 M4-C 前確認；不得把本草案的建議當成使用者已核准的業務規則。
