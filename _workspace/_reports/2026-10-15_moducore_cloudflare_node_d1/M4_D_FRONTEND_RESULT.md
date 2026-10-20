# M4-D 員工畫面整合結果

日期：2026-10-16。狀態：核心串接完成；管理員 CRUD 本機瀏覽器通過，角色完整瀏覽器 Gate 尚待補驗，不進入部署。

## 已完成

- `platform/frontend/projects/project-b/modules/employee/components/EmployeeEditor.vue`：移除無效密碼欄位，送出明確白名單，說明員工不等於登入帳戶，新增忙碌與安全錯誤提示。保留既有 scoped Sass，避免既有通用選擇器外溢。
- `modules/employee/pages/list.vue`：本人僅依 user_id 關聯，不回退 users.id；移除密碼更新，電話允許清空；新增載入、錯誤、重試及未關聯狀態。
- `modules/employee/services/employeeService.js`：回應欄位白名單、HTTP 失敗不能轉成功空表、移除 notification 私有 import；通知依已確認規則後補。以身份與 sessionEpoch 阻擋登出後的延遲回應。
- `modules/employee/store.js`、`api/employeeApi.js`：員工資料不持久化，排除舊密碼欄位；清理舊 employeeStore 儲存鍵。`layout/LayoutRoot.vue` 經已註冊 Store，在身份改變時清除清單、搜尋、編輯資料；不改共享 World／Container／Router。
- `components/EmployeeTable.vue`：限制操作按鈕、刪除忙碌／錯誤狀態及頁面內二次確認。主管編輯一般員工仍由 Worker 最終授權，若連結的登入帳戶有管理權限，Worker 會拒絕；不把按鈕可見當成授權。

## 驗證

- 後端 42／42、登入及 Layout 11／11、API 傳輸 3／3、新增員工服務與 Store 4／4，共 60 項通過。
- `platform/frontend/scripts/test-employee-service.mjs` 覆蓋機密欄位排除、錯誤回應、延遲回應隔離及不持久化／身份重設清理。新增 test:employee，加入尚未推送的 project-b CI 步驟。
- project-b real build 成功，git diff --check 通過。
- 真實前端＋Worker＋一次性 D1：管理員登入、新增員工、修改電話、重整讀回、二次確認刪除後清單為零、登出回公開頁通過。原生 confirm 曾使驗收分頁卡住，已改頁面內確認並重新測通。
- 畫面證據：`/private/tmp/project-b-employee-result.jpg`，為合成資料的暫存截圖。刪除的僅是一次性本機測試員工；整個測試 DB 已隨程序關閉丟棄，非遠端資料。

## 未完成與下一步

M4-D2 仍須補主管／一般員工的真實瀏覽器操作矩陣，包含本人電話、無關聯、權限拒絕、API 失敗畫面、帳號切換與延遲回應情境；自動測試不能替代全部 UI Gate。本人儲存成功仍沿用既有 alert，尚未驗證其在自動化瀏覽器的行為。未完成前不宣告 M4-D 全部驗收或 G3 通過。

M4-C 的保守歷史刪除限制仍存在，見 ISSUE-20261016-005。未推送、部署、遠端 Migration 或建立真實帳戶；既有 .env 未改。成本僅本機，不新增付費資源。

偏離檢查：維持平台單一身份來源、Employee 私有 Store 與模組 API 邊界；無新框架、抽象層或跨模組私有服務依賴。沿用專案命名與現有 UI 結構。
