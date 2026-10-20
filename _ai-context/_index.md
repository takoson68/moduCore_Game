---
status: active
phase: cloudflare-transition
authority: ai-entry
updated: 2026-10-15
implemented: true
---

# AI Context Index

`_ai-context/` 是 AI 的操作與導讀層，採用 `h5-basic-style` 的 AI Context 架構，但內容依 moduCore 現有治理重新整理。

本層不定義 World，不取代 `_VibeCore/`，也不能修改正式架構裁決。

## 初始化必讀

新對話、上下文重置或接手工作時依序完整讀取：

1. [AI 實作引導](./AI_IMPLEMENTATION_GUIDE.md)
2. [架構規則摘要](./ARCHITECTURE_RULES.md)
3. [導讀規則](./導讀規則.md)
4. [紀錄管理規則](./紀錄管理規則.md)
5. [語言規則](./語言規則.md)
6. [`_VibeCore/STARTUP_DECLARATION.md`](../_VibeCore/STARTUP_DECLARATION.md)
7. [`_VibeCore/AI_PROJECT_ENTRY.md`](../_VibeCore/AI_PROJECT_ENTRY.md)
8. [`_workspace/CURRENT_WORK.md`](../_workspace/CURRENT_WORK.md)

初始化只建立最小必要上下文。完成後依任務進入 `_VibeCore/**/index.md`，不全量讀取歷史報告、舊存檔或所有 Project。

## 按需讀取

- [工程標準摘要](./ENGINEERING_STANDARDS.md)：修改程式、設定、Migration、測試或部署時。
- [Git 工作規則](./Git工作規則.md)：查看狀態、建立分支、Commit、Push 或合併時。
- `_VibeCore/skills/index.md`：建立或修改工程內容時，依 RootIndex 強制讀取。
- `_VibeCore/projects/index.md`：建立、理解或修改 Project 時。
- `_VibeCore/api/index.md`：API、Auth、錯誤模型與生命週期任務。
- `_VibeCore/modules/index.md`：Module 註冊、初始化與資料互動任務。
- `_workspace/_reports/`：當前任務明確引用的研究或執行規格。

## 文件狀態

- `draft`：草稿，不可當成正式依據。
- `planned`：方案已整理但尚未落地。
- `active`：目前生效。
- `implemented`：內容已有實作或流程支援。
- `accepted`：已確認決策，變更需留下新紀錄。
- `reference`：參考資料，不代表目前實作。
- `superseded`：已被新文件取代。
- `archived`：歷史資料，預設不讀。

`implemented: true` 只表示該文件描述的機制已建立，不表示所有業務功能均完成。

## 資料分區

| 類型 | 位置 |
|---|---|
| AI 操作方式 | `_ai-context/` |
| World 與正式治理 | `_VibeCore/` |
| 當前工作與人類草稿 | `_workspace/` |
| 階段性研究與報告 | `_workspace/_reports/` |
| 實際程式 | `platform/` |

## 核心原則

- 先讀索引，再讀主題文件。
- 原始碼、設定、測試與命令輸出用來判斷實際現況。
- 實作現況不得反向推翻 World 或 Engineering 的正式規則。
- `CURRENT_WORK.md` 只用於恢復停止點，不是架構真相。
- PHP／MySQL 是舊後端參考；目標後端是 Workers JavaScript + D1／SQLite。

