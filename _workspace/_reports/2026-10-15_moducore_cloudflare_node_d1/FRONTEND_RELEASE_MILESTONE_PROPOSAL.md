# 前端 ZIP 版本管理：里程碑加入建議

日期：2026-10-16。性質：分析提案，尚未核准實作；本輪不修改程式、Workflow 或部署。

## 1. 建議結論

在 M4 與 M5 之間新增 **M4.1：前端發行包與驗收基線**；先有 ZIP 成品、版本識別及還原驗收，再把唯讀版本列表併入既有 M8-A，真正控制線上版本的操作留在 M9。M5～M7 編號與業務範圍不變，不把完整版本後台列為它們的新阻擋條件。

使用者目前要求分析加入方式，不等於授權建立儲存服務、修改參考專案或直接發布。M4.1 建議優先執行，待確認後才成為正式排程。

## 2. 實際依據

- `platform/frontend/scripts/build-cloudflare.mjs`：指定 Project 的 Vite build。
- `.github/workflows/deploy-staging.yml`：各矩陣目標建置至獨立 `.assets/{target}`，部署前未保存 ZIP；目前沒有 upload-artifact 步驟。
- `platform/worker/wrangler.project-b-staging.json`、`wrangler.dinecore-staging.json`：Static Assets 目錄綁定，Worker 與靜態資源一起部署。
- `/Users/zhangyu/Desktop/h5-dist-preview/server.mjs`：deploy 約 230 行保存 ZIP／解壓產物／release.json；selectVersion 約 267 行改 current／previous；rollback 約 350 行切回版本。
- 參考專案 `README.md`：固定站點、多版本標籤及刪除保護；目前沒有登入權限，不可原樣公開部署。

應沿用的是「成品可保存、可識別、可驗收、可切換」的概念，不是把 Node 本機磁碟、unzip 子程序與 state.json 寫入模式搬到 Workers。

## 3. 分段與 Gate

| 階段 | 範圍／交付物 | 完成 Gate | 暫時不做 |
|---|---|---|---|
| M4.1-A | ZIP、建置 manifest、校驗檔與短期 Artifact 封存 | 解壓後檔案與同次部署輸入的檔案雜湊一致；專案不混包；無密碼／原始環境檔；下載可用 | 管理後台、線上切版 |
| M4.1-B | 下載既有 ZIP 的本機還原與驗收說明／工具 | 不重建原始碼即可還原畫面；靜態入口／資源／SPA 深層路由通過；API 目標明確 | 自動改遠端、無隔離預覽寫正式 D1 |
| M8-A 擴充 | 受保護的唯讀專案與版本清單、標籤／說明、下載與發布紀錄關聯 | 可區分封存版本、線上版本、失敗與過期；不洩漏管理 Token | 新增公開上傳、一鍵發布 |
| M9-A 候選 | 核准後選擇已驗證版本發布／回復 | 權限、相容檢查、鎖定目標、審計、失敗回復及跨專案隔離通過 | 自動回退資料庫 |
| M9-B 候選 | ZIP 上傳／安全檢查／隔離預覽／正式採納 | 路徑穿越、symlink、解壓膨脹、數量／容量及主動腳本隔離測試通過 | 把任意 ZIP 上傳即視為可信發布 |

M4.1-B 可參考 h5-dist-preview，但尚未驗證 moduCore 包在該工具的 SPA／資源路徑／API proxy 行為；不宣稱直接相容。前端包無法獨立提供後端功能，本機 API 須另啟 Worker 與測試 D1，或明確標成僅靜態預覽。控制台上的改標籤屬寫操作，M8-A 第一版先唯讀顯示既有 manifest／發布說明；即時編輯標籤需另行定義權限，不默默放寬唯讀範圍。

## 4. 最小包格式與發布順序

- 每專案／目標分開 ZIP；檔名含 project、target、short SHA、run ID／attempt，避免重跑覆寫。
- ZIP 根目錄是 index.html 與實際靜態資源，不含 .assets 外層、node_modules、.env、.DS_Store、憑證或工具暫存。公開前端設定本來就可被訪客讀到，仍不得塞後端 Secrets。
- manifest 記錄格式版本、Project、環境、Git SHA、建置時間、CI run／attempt、API 契約識別與所需 Schema。尚未建立可機器判讀的 API 相容版本時標為待人工核對，不把目前 migration 數量當成自動相容保證。
- 每個靜態檔案有 SHA-256 清單；ZIP 自身的 SHA-256 放外部，避免包內自我雜湊循環。
- 從同一次建置目錄製作 ZIP並部署；若跨 Job，下載／校驗／解壓同一個包再部署，禁止重新 build 冒稱相同成品。
- 順序：Build／測試 → 產包並校驗 → 封存 → 既有 Migration／Deploy／Smoke → 保存發布回執。
- 建置 manifest 不回頭修改；發布回執另外記 artifact ID／digest、Worker version、CI、目標、驗收狀態與時間。CI 失敗的包可作診斷，但不得標成可發布版本。
- 封存失敗時在 Migration／Deploy 前停止該目標；部署失敗也不能把 build success 顯示成 release success。

M4.1-A Gate 不可拿本機壓縮成功替代 CI 下載／校驗證據；本機與 CI 各驗至少一次，再核對另一專案不受影響。新增成品不回填假造歷史 ZIP：86810ff 可以另行重建成「歷史重建包」，但不能宣稱是當時已部署的原始二進位成品。

## 5. 與現有回復能力的界線

Cloudflare version 包含 Worker、Static Assets、Bindings 及相容設定，儲存資源的資料變化不隨版本保存。因此「只拿舊 ZIP 搭配現在後端」與「回復完整 Worker version」是兩種不同操作。

M9 前先確認選哪一種操作，再核對 API／Schema；不得因為 ZIP 有保存就承諾任意前後端版本可混用。D1 還原維持既有獨立流程。

## 6. 成本與待確認

維持全部專案每月 NT$100 上限。M4.1 優先用既有 GitHub Actions Artifacts，不新增 Worker／D1／R2；初始保留期建議 7 天，屬待確認值，不承諾免費或永久保存。先量實際 ZIP 大小、兩站每月建置次數及帳戶可用儲存，再決定保留期／份數。Artifacts 會過期、也會隨 workflow run 刪除；重要版本需另訂長期保存方式，不能偷偷改成不限期 GitHub Releases。

待確認：是否優先開始 M4.1-A；短期保留天數；本機預覽採現有工具整合或獨立最小指令；長期保存需求。完整版本操作 UI、外部 ZIP 上傳、付費儲存均不包含在此次分析授權。

## 7. 本輪驗證與來源

僅核對索引、既有規格／程式與文件差異；未建置新 ZIP、執行新測試、Commit／Push 或部署。偏離檢查：不改 World／Container、專案前端組裝與資料庫隔離；不引入儲存抽象或控制台服務。

- [Cloudflare Versions](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [GitHub Workflow Artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub Artifact 保留設定](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts)
- [GitHub Actions 用量／計費](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
