---
status: active
authority: engineering-workflow
updated: 2026-10-15
implemented: true
---

# AI 工程工作流程

本文件補足 AI 的日常作業方法，不重新定義 World、Module、Project 或 Container。

## 1. 任務開始

1. 完成 `AGENTS.md` 指定的最小導讀。
2. 讀取 `_workspace/CURRENT_WORK.md`，確認上次停止點與工作樹注意事項。
3. 執行 `git status --short --branch`，確認既有修改所有權。
4. 將需求整理為：目標、範圍、完成條件、禁止事項。
5. 只讀取與任務直接相關的索引、規格與原始碼。
6. 若需求已足夠明確，直接開始；只有重大架構分歧、資料風險或權限不足時才詢問。

## 2. 證據規則

所有分析與修改判斷應標示依據類型：

- `規則`：World 或 Engineering 的正式約束。
- `實作`：實際原始碼與設定。
- `驗證`：測試、建置、執行或命令輸出。
- `推論`：尚未驗證的合理判斷。
- `待確認`：現有資料不足，不能自行定案。

文件與程式不一致時，以實際行為作為現況，但不得用現況反向放寬治理規則；應記錄落差並依任務範圍修正或提出決策。

## 3. 任務執行

- 採最小合法變更，不因單一需求建立未被證明必要的新抽象。
- 先保護使用者既有修改，再處理本次範圍。
- 修改前確認責任層；修改後檢查是否越過 Project、Module、Core 或 World 邊界。
- 可逆且屬於正常實作流程的動作直接完成；破壞性、外部發布或不可逆操作必須取得明確授權。
- 長任務以短更新說明目前證據、已完成項目與剩餘風險。

## 4. 驗證矩陣

依變更風險選擇最低充分驗證：

| 變更類型 | 最低驗證 |
|---|---|
| 純文件 | 路徑、連結、索引與 Git Diff |
| 單一 Project | 該 Project Build，必要時人工流程 |
| 平台共用前端 | 受影響 Project Build；跨 Project 能力至少驗證代表性 Project |
| Router／Auth／API | Build + 對應契約或 Smoke Test |
| Migration／資料庫 | 空庫 Migration + 約束檢查 + 回復策略 |
| 部署設定 | Preview／Staging 驗證，不直接以 Production 作首次驗證 |

無法執行的驗證必須在交付時明確列出，不得用「應該可以」取代。

## 5. 完成條件

任務只有在以下條件成立時才可回報完成：

- 使用者要求的產出已存在。
- 變更範圍與禁止事項均被遵守。
- 已完成風險相稱的驗證。
- Git 工作區內所有變更均能說明來源。
- 新增正式文件時已更新對應索引。
- 穩定問題、假設或決策已放到正確位置。
- `_workspace/CURRENT_WORK.md` 已更新為最新停止點。
- 未驗證項目與剩餘風險已清楚列出。

## 6. 工作資料分流

| 資料 | 位置 |
|---|---|
| 世界與不可違反邊界 | `_VibeCore/world/` |
| 已生效工程規則 | `_VibeCore/engineering/` |
| 問題、討論、假設 | `_VibeCore/feedback/` |
| 可重複工程策略 | `_VibeCore/skills/` |
| 當前停止點 | `_workspace/CURRENT_WORK.md` |
| 階段性分析與一次性報告 | `_workspace/_reports/` |
| 歷史草稿與人類筆記 | `_workspace/舊的存檔/` 或既有主題資料夾 |

不得將原始對話全文直接升格為正式規則。穩定結論必須重新整理、附上證據並放入正確治理層。

## 7. 後端轉換期規則

- `platform/backend/` 的 PHP／MySQL 實作目前是行為與契約來源，不是目標 Runtime。
- 新後端功能的目標是 Cloudflare Workers JavaScript + D1／SQLite。
- 移植時優先保持 API 契約與 moduCore 前端邊界，不反向重寫平台核心。
- MySQL SQL、交易與檔案系統操作必須經過相容性設計，不得機械翻譯後宣稱完成。
- 未完成移植前，不刪除 PHP 參考實作。

