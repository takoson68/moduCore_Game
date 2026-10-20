# M4-C 員工 API 本機結果

日期：2026-10-16。使用者已同意管理員／主管／本人權限、關聯刪除保護、員工停用不連動登入停用、通知延後。

## 已完成

- `platform/worker/src/employees.js`：保留既有 list／create／update／delete 路徑及回應形狀；沿用 Session、固定專案及錯誤 Trace ID。
- `platform/worker/src/index.js`：註冊四條路由。其他專案無法使用 Employee 能力。
- 管理員可管理全部員工資料；主管可讀清單、建立及更新一般員工，不可改主管／管理員或連結管理帳戶的資料，亦不能升權、刪除。本人依 user_id 精確過濾，只能改電話。
- 不接受 password、user_id、tenant_id 等非本次操作欄位；不建立帳戶、不變更 users 權限／狀態。通知依確認延後，沒有隱性寫入通知表。

## 驗證

`platform/worker` 執行 `npm test`，42／42 通過。新增六項實際 D1 的 Worker 路由測試，及一項在 Miniflare Workers Runtime 執行的完整 CRUD 測試。涵蓋回應、跨專案／未登入／停用帳戶、主管升權防護、本人 ID 混淆、欄位注入、非法 ID、錯誤無部分寫入、刪除保護、停用員工後仍可登入。

同步更新 `test/auth.test.js` 及本機瀏覽器工具的 Worker 模組清單；未修改前端畫面。`git diff --check` 通過。

## 限制與下一步

列表維持陣列契約，最多查 1001 筆；超過 1000 筆明確回 PAGINATION_REQUIRED，不假裝資料完整。尚未實作分頁 UI。

目前歷史業務表未移植，刪除採保守規則：任何其他 project_b_* 業務表存在即回 409，即使表是空的也拒絕；連結登入帳戶亦拒絕。這比已確認的「有歷史引用才拒絕」更嚴格，屬暫時安全限制，已記錄 KNOWN_ISSUES，不能稱精確引用檢查完成。後續業務 Migration 必須同步補引用約束與精確刪除條件，不可直接放寬移除保護。

下一步 M4-D：串接員工畫面，移除無效密碼與密碼持久化、本人以 user_id 關聯、不把 API 失敗轉為空表、清理跨模組私有引用、登出清除員工資料，完成瀏覽器驗收。

未做遠端 Migration、真實帳戶、Commit／Push 或部署；不宣稱線上 Employee 已可用。僅本機一次性測試，未新增雲端成本。設計偏離檢查：保持 World／Container、單一 authStore、模組 API 邊界與既有命名；無新框架、ORM 或抽象層。
