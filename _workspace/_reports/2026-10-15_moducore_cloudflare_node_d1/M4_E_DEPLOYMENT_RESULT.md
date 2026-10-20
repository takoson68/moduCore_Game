# M4-E Staging 發布結果

日期：2026-10-16。使用者明確同意工程提交、Push world-oop、兩站部署與合成驗收。

## 結果

- 工程提交 `86810ff3126f778454a5ada1baecaeb18cade476`，已推送 world-oop。
- [GitHub Actions 38863036522](https://github.com/takoson68/moducore_platform/actions/runs/38863036522) 全數成功：兩站建置、測試、dry-run、Migration、部署、公開 Smoke、Auth／跨站隔離；project-b Employee Smoke 亦成功，刪除結果為 deleted。
- project-b：https://project-b-staging.takoson68.workers.dev/ ，新版本 `7c13f778-0a2b-4c03-aed3-15f2bb4b8349`；發布前版本 `cd48490c-e0db-4f3c-a4b9-ccb70cd91eef`。
- dineCore：https://dinecore-staging.takoson68.workers.dev/ ，新版本 `048d3a62-540f-4cb9-a7ce-e7f0eccaebc9`；發布前版本 `cf5ee141-9ed6-422d-8b08-7ba7128be32d`。
- 舊 moducore-staging 版本仍為 `2a42b8d1-62ae-4a53-b457-12d0f465c400`，未發布或修改舊庫。

## 資料核對

兩庫發布前 Migration=3、users=0、Token=0；本輪唯讀核對 rows_written=0。發布後均 Migration=4、users=0、Token=0、employees=0，foreign_key_check 無錯。各庫回報 86016 bytes；合成帳戶／員工已清除，沒有真實管理員或預設密碼。Auth 限流記錄依既有到期政策保留，不全量清表。

Employee 線上驗證包含建立、主管修改／拒絕升權／拒絕刪除、本人清單與電話更新、他人操作拒絕、綁定帳戶刪除保護、跨專案識別拒絕，以及 finally 清理。資料表與前端不代表 Task／Vote／Notification 已移植。

## 範圍與限制

僅提交發布白名單 25 個工程檔案。既有 frontend/.env、AI／治理文件與報告仍留本機，未混入提交；工程工作樹已無待提交變更。前端 18 項與後端 43 項在對應 CI 步驟成功。

本輪沒有刻意回復已成功的新版本；保留上述發布前版本供必要時回復，D1 0004 不隨 Worker 回復撤銷。M3.1 原有回復／安全失敗證據仍為先前結果，不冒稱本輪重新演練。精確歷史引用刪除仍受 ISSUE-20261016-005 限制；通知依核准延後。

M4 Employee Pilot 的部署與線上合成 Gate 已通過；正式使用者帳號仍未建立，故目前無法直接以真實帳密登入操作。下一步先與使用者確認 project-b 首位管理員的帳號與顯示名稱，再由使用者於安全輸入介面輸入密碼；不可貼在對話或寫入文件。完成後才能進行使用者本人操作驗收，不自動跳到其他專案移植。

保持 Free、未新增 Worker／D1 或付費服務；未完成當日帳單／總額度查證，不宣稱已驗證實際月費。設計偏離檢查：無 World／Container 變更，保持專案／資料隔離與既有 CI 結構。
