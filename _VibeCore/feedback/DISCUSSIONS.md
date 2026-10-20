## 前端成品版本管理（2026-10-16，OPEN）

使用者要求分析如何納入里程碑。提案見 `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/FRONTEND_RELEASE_MILESTONE_PROPOSAL.md`：M4.1-A 封存、M4.1-B 本機驗收、M8-A 唯讀版本列表、M9 受控切版／安全上傳。優先順序、短期保留值及長期儲存尚待確認，不視為已生效工程規則或部署授權。不得直接搬用參考工具的本機磁碟與無登入控制台。

## M4-B 員工與登入帳戶契約（2026-10-16，OPEN）

最新：使用者已同意 M4-C 規則（管理員全部、主管一般員工且不升權、本人讀取／改電話；有帳戶或歷史不可刪；員工停用不連動登入；通知後補）。這些待確認項已定案，M4-C 本機實作見 M4_C_CRUD_RESULT.md。歷史刪除精確性暫時受 ISSUE-20261016-005 限制；下方未批准文字僅為歷史紀錄，不再要求重複確認相同政策。

更新：使用者已選 A，確認員工與登入帳戶分開、不自動開通登入；本機 0004 與測試已完成，詳見 M4_B_SCHEMA_RESULT.md。以下原先「先不建 Migration」已被此次選擇與實作取代。主管範圍、狀態連動、刪除及通知政策仍 OPEN，不把選 A 擴張為其他業務政策的核准。

來源核對見 `_workspace/_reports/2026-10-15_moducore_cloudflare_node_d1/M4_B_EMPLOYEE_SPEC.md`。待使用者決定：員工可無登入帳戶、建立不開通登入（建議），或新增時原子建立帳戶。兩者會影響 Schema、username／password 表單與權限流程，尚未定案。員工職能／狀態是否同步 users、主管管理範圍、刪除限制及新增通知是否可延後，亦未批准；草案不可作已生效規則。先不建 Migration，不修改 World。

任務：
請以「平行新世界遷移」方式，建立 `ai_new/` 資料夾，
將現有 `ai_new/` 內的世界與工程文件，依新的歸納方法重寫並整理到 `ai_new/`。

【輸入來源】
- 只允許讀取現有 `ai_new/` 目錄（含 ai_new/world、ai_new/engineering、ai_new/交流 或 ai_new/feedback 等）
- 不得依賴對話內容推論缺失內容
- 不得引入任何未出現在 ai_new/ 內的概念或規則

【目標輸出結構（必須完全一致）】
ai_new/
- world/
  - 01_INVARIANTS.md
  - 02_ROLE_CONTRACTS/
    - frontend-platform.md
    - module.md
    - container.md
    - store.md
  - 03_LIFECYCLE.md
  - 99_CLARIFICATIONS.md
  - INDEX.md
- engineering/
  - INDEX.md
  - CONVENTIONS.md
  - CHANGELOG.md
  - GIT_AUTOMATION.md
- feedback/
  - DISCUSSIONS.md
  - KNOWN_ISSUES.md
  - ASSUMPTIONS.md

【遷移規則（最重要）】
1) 任何內容只能從 ai_new/ 搬運、重寫、歸納，不得新增新規則
2) 01_INVARIANTS.md：
   - 必須包含「世界不變量」清單
   - 內容來源應以原本的 World Boundaries / World Invariants 為主
3) 02_ROLE_CONTRACTS/：
   - 每份 Role Contract 必須在檔首加入 Derived From，列出對應的不變量編號
   - 不得自創新的不變量；若缺資料只能寫「缺口」並指出來源文件不存在
4) 99_CLARIFICATIONS.md：
   - 收納「曾在工程/討論中出現，但未被世界正式定義」的裁決或缺口
   - 若找不到來源，就不要寫
5) feedback/：
   - 將 ai_new/ 中屬於「交流、待釐清、討論、假設、已知問題」的內容歸類放入
   - 不得把 feedback 當成 world 規則
6) 禁止改動現有 ai_new/，只允許建立/寫入 ai_new/

【一致性檢查（你必須做）】
完成 ai_new/ 後，請自行檢查並輸出一份報告，寫入：
- ai_new/world/INDEX.md 末尾的 "Consistency Report" 區塊

檢查項目至少包含：
- 不變量是否只存在於 01_INVARIANTS.md（不得散落）
- Role Contract 是否都引用 Derived From（若無就列為缺口）
- feedback 內容是否沒有被寫成世界規則（若有就列出位置）
- 是否存在內容重複、矛盾或來源不明（列出檔名與段落標題）

【輸出回報】
最後請回報：
- ai_new/ 是否建立完成
- Consistency Report 是否已寫入
- 若存在阻塞缺口，請列成清單（不要自行補完）

**********************

議題：模組放置位置的世界層裁決需求
背景：目前工程實作已將模組放入 `platform/frontend/projects/{project}/modules/`，但世界結構定義（`ai_new/world/06_STRUCTURE_AND_NAMING.md`）仍採全域 `/modules/{module-name}/`。這造成世界語意與工程落地衝突，後續易重演。
需求：希望世界層明確裁決「模組是否必須位於專案目錄下」，並界定其合法結構與語意角色。
影響：若裁決為專案內模組，需調整世界結構定義；若維持全域模組，則應回退工程實作並恢復一致性。
建議變更類型：Refinement 或 Behavioral Change（待世界設計者判定）。
