# ModuCore 應用於網頁遊戲的初步架構構思

> 文件定位：本文僅記錄 ModuCore 應用於網頁遊戲的初步架構思考與待驗證假設，不代表 ModuCore 已實現這些遊戲功能。本文不具正式治理或架構裁決力，不修訂、取代、擴張或重新解釋 ModuCore 原有的 World、Engineering、Core、Module 與 Project 文件。本文中的 `World Context`、`Game World` 與 `Game Runtime` 等用語只在本遊戲構思內有效；若與原有正式文件衝突，一律以原有正式文件為準。

## 1. 架構總覽

本構思的目的，並非將 ModuCore 改造成遊戲引擎、遊戲框架或專用的遊戲底層架構，而是**在不改變 ModuCore 原有核心設計的前提下，透過既有模組機制新增一個具備完整遊戲管理能力的 Game Module**。

ModuCore 原有的 `World`、`Project`、`Module`、`Pages` 與容器機制，可以自然地承載網頁遊戲的組織方式。但這不代表遊戲內部的架構需要被納入 ModuCore 核心。

Game Module 以 `game.js` 作為遊戲執行環境的統一入口與協調介面，並在進入遊戲時建立自己的獨立 Game Container，負責組合與管理遊戲內部的定義、狀態、服務、系統、場景、引擎適配及生命週期。

Game Container 延續 ModuCore 的容器模式與工廠模式設計理念，也可以視實際需求吸收 ECS（Entity Component System）、Object Pool 等成熟架構的優點，但不需要因此改變 ModuCore 原有設計，也不預設每款遊戲都必須採用這些策略。

遊戲引擎仍然負責自身擅長的渲染、物理運算及相關執行機制。Game Module 則負責協調遊戲的整體運作，不強制取代各引擎的原生循環。

**核心原則：ModuCore 不為 Game 而改變；Game 透過 ModuCore 既有的模組能力而存在。**

### 1.1 一句話架構定義

> **ModuCore World 負責承載與卸載 Game；`game.js` 透過獨立 Game Container 組合 Game Registry、Factory、Stores、Services、Systems、Scenes 與 Engine Adapter，形成可獨立管理生命週期的遊戲執行環境。Capability Definitions 是 Registry 內的能力定義集合，Object Pool 則是按需求選用的效能策略。**

### 1.2 核心術語

為避免後續章節把不同層級混在一起，本文統一使用下列語意：

| 名稱 | 本文中的責任 |
| --- | --- |
| ModuCore World | 網頁平台的 Host Context；提供 Project、Module、Page、Router、平台服務與 Game 掛載邊界 |
| World Container | World、Project 與平台能力的註冊及取得範圍 |
| Game Module | 將 Game Entry、Runtime Factory 與必要契約接入 ModuCore 的模組邊界 |
| Game Runtime | 進入遊戲後實際建立、運行、重置與銷毀的遊戲執行環境 |
| `game.js` | Game Runtime 的 Facade 與 Lifecycle Coordinator，不承載各子系統的內部實作 |
| Game Container | Game Runtime 私有的能力範圍，生命週期跟隨 Game Runtime，不繼承 World Container |
| Game Registry | Entity Definitions 與 Capability Definitions 的註冊及查找邊界；早期文中的 Object Registry 可視為其中一部分或舊稱 |
| Entity Factory | 依 Entity Definition 查找並組合能力，建立遊戲邏輯實例 |
| Systems | 執行可共享或批次處理的遊戲規則，不為每個 Entity 各建一份完整 System |
| Scenes | 組織特定空間、資源、Entities 與需要啟用的 Systems |
| Engine Adapter | 隔離特定引擎的渲染、物理、場景節點、資源及銷毀方式 |
| Object Pool | 可選的實例或資源重用策略，不屬於 Registry，也不是 Game Runtime 的必備核心 |

### 1.3 文件閱讀主線

本文後續依照下列順序展開：

```text
World 與 Game 邊界
    ↓
Game Module 與場景／系統組織
    ↓
獨立 Game Container 與反向註冊
    ↓
Entity / Capability Definition 與 Factory 組合
    ↓
遊戲狀態所有權
    ↓
Engine Adapter、Frame Loop 與 UI 邊界
    ↓
game.js、Game Lifecycle 與 Reset Scope
    ↓
完整運行流程、待驗證事項與最小原型
```

章節中的程式與目錄均為責任示意；除非另有說明，皆不是已實現 API 或正式規格。

為避免把「目前方向」與「待驗證細節」混為一談，本文採用以下狀態區分：

| 狀態 | 內容 |
| --- | --- |
| 目前架構方向 | World 承載與卸載 Game；Game Runtime 擁有獨立 Game Container；雙方只透過 Host Contract 交接；`game.js` 是 Facade；遊戲引擎保有自身循環 |
| 候選內部設計 | Game Registry、Entity Factory、Engine Adapter Factory、EntityManager、動態能力組合及更小的 Session / Scene Scope |
| 按需求選用 | Object Pool、完整 ECS、Batch Update、Spatial Index、Data-Oriented Design，以及多引擎同時運行 |
| 尚未完成 | 對應 API、目錄、清理順序、錯誤回復、效能門檻與實作驗證 |

### 1.4 核心目標：建立不污染 ModuCore 的遊戲架構邊界

這份討論的長期目標，是逐步整理出一套完整且獨立的 Game Module Architecture，讓人與 AI 未來可以在遊戲模組的邊界內持續協作，而不因遊戲的複雜度、重構或快速演化而修改最外層 ModuCore。

Game Module 雖然使用與 ModuCore 相同的容器設計理念，但 Game Container 與 World Container 是兩個獨立的管理環境，不建立容器繼承關係，也不將遊戲內部責任交給 World。

因此，本構思的首要指標不只是「遊戲能不能運作」，還包括：

- **維持核心獨立性**：Game 的新增、修改或移除，不應要求修改 ModuCore 原有的 World、Core、Boot 或共用平台層。
- **建立獨立 Game Container**：由 Game Module 自行組合與管理 Game Registry、Factory、Stores、Services、Systems、Capability Definitions、選用的 Object Pool 及 Engine Adapter。
- **保留遊戲架構的演化自由**：可以吸收 ECS、工廠模式、物件池等成熟設計，但不強迫 Game Module 完全遵循某一種遊戲框架。
- **明確定義生命週期**：World 透過既有模組機制掛載與卸載 Game；Game Container 自行管理遊戲內部的建立、運行、重置與資源釋放。
- **維持公開契約**：Game 只透過公開的 Host Contract 取得 ModuCore 提供的能力，不依賴平台私有實作。
- **保留引擎自主性**：不同遊戲引擎可以透過 Engine Adapter 接入，並保留各自適合的執行與渲染機制。
- **建立 AI 協作邊界**：AI 能在清楚的 Game 目錄、索引與責任範圍內進行開發、測試及重構。
- **避免反向污染核心**：AI 若發現現有平台能力不足，應先在 Game 邊界內記錄需求，而不直接修改 ModuCore 核心。

這可以概括為：

```text
ModuCore
│
├── World / Core / Project / Module / Pages
│   └── 維持原有架構與職責
│
└── Host Contract
    │
    └── Game Module（game.js）
        │
        └── Game Container（獨立）
            ├── Registry / Factory
            ├── Capability Definitions
            ├── Object Pool（按需求選用）
            ├── Entity / Component
            ├── Stores / Services / Systems
            ├── Scene / Game Loop
            └── Engine Adapter
                │
                └── p5.js / Three.js / Phaser 等

Game Module Boundary
├── AI 協作範圍
├── 遊戲架構演化範圍
├── 遊戲測試與重構範圍
└── 不反向修改 ModuCore
```

上述結構為概念性的責任示意，並非最終程式目錄或實作規格。

Game Module 可以擁有完整的遊戲執行與管理能力，但這些能力都應封裝在 Game Module 自身的邊界內。

**Game Module 的完整性，不代表 ModuCore 核心需要承擔遊戲架構的複雜度。**

這是本文後續所有分層、Facade、Container 使用方式與生命流程設計的共同出發點。

### 1.5 架構觀察：加入遊戲能力不需修改 ModuCore 核心

目前的討論出現一個很清楚的架構成功訊號：即使新增 Game Module、`game.js`、Game Container、Game Store、Scene Service、Systems 與 Engine Adapter，也不需要為此改寫 ModuCore 的 World、Core、Boot 或既有 Container 行為。

這表示原本的模組化設計，在概念上已經具備承載不同領域功能的擴充空間。

而 Game Module 也不需要重新定義 ModuCore 的核心架構，只需沿用既有容器設計理念，在自己的獨立執行環境內建立適合遊戲需求的管理機制。

因此，後續架構驗證的重點應放在：

- Game Container 能否獨立完成遊戲物件、能力與系統的註冊及管理。
- Game Module 能否透過既有 Host Contract 完成掛載、運行、重置與卸載。
- 不同遊戲引擎能否透過 Adapter 接入，而不影響 Game Module 的核心管理方式。
- Game Module 內部架構的修改，是否能維持與 ModuCore 核心的隔離。

這些仍屬於需要透過實際原型驗證的設計目標，而非已經完成的技術驗證。

最終希望達成的不是「讓 ModuCore 成為遊戲框架」，而是：

**證明 ModuCore 可以在不修改自身核心的情況下，透過獨立模組承載一套完整且可持續演化的遊戲架構。**

新增的遊戲能力可以依循原有模組哲學：

```text
Game Module
├── 宣告 Game Entry / Page / Route
├── 向 World Container 註冊 Game Runtime Factory 或 Entry Capability
├── 在進入遊戲時建立私有 Game Container（候選）
├── 將 Game Stores 與 Scene / Engine Services 註冊到 Game Container
└── 在 Project Ready 後依 Entry Policy 啟動
        ↓
ModuCore 核心維持不變
```

這驗證了 ModuCore 原本希望達成的設計性質：

- 新領域以模組形式進入，不回頭污染核心。
- 能力透過註冊成為世界的一部分，不需直接修改 World。
- 模組可以缺席；沒有 Game Module 的 Project 仍可正常運作。
- Game Runtime 可以持續擴大，但複雜度保留在 Game Architecture Boundary 內。
- AI 可在 Game 邊界內協作，而不需取得修改 ModuCore 核心的預設權限。

對「new 一個遊戲容器」的說法，需要區分不同層級：

- World Container 仍只需知道 Game Entry、Game Runtime Factory 或 Game Host Contract。
- Game Runtime 可在進入遊戲時 new 一個私有 `Game Container`，專門管理 Game Store、System、Scene 與 Engine Service。
- `Game Container` 不是第二個 ModuCore World Container，而是 Game Runtime 內部、具有自己生命週期的私有能力範圍。
- World 能力不應由 Game Container 任意回透取得，而應透過明確的 Host Contract 或 Adapter 注入。

目前值得優先驗證的混合模型是：

```javascript
// World / Project 邊界：只註冊進入遊戲所需的入口能力
register.service('game.runtimeFactory', createGameRuntime)
register.routes(gameRoutes)

// Game Entry 成立後：建立遊戲私有容器
const game = createGameRuntime({ host: gameHostContract })

// Game Runtime 內部
game.container.register('player', playerStore)
game.container.register('session', gameSessionStore)
game.container.register('scene', sceneService)
game.container.register('engine', engineAdapter)
```

以上名稱與 API 僅是語意示意，不代表現有 ModuCore 已有相同介面。目前可將這視為對 ModuCore 設計方向的概念驗證；要宣告實作層也完全成立，仍需透過最小原型驗證註冊、啟動、重置與清理全流程。

另一個逐漸確認的核心觀察是：**Game 可以借鏡 World 的世界觀與生命流程思考，但不與 World 共用同一個生命週期，也不必複製所有階段。**

作為參考，Game Boot 可從 World Boot 借鏡下列模組化階段語法：

```text
Definition Resolution
    → Core Boot
    → Module Discovery
    → Eligibility Evaluation
    → Capability Registration
    → Module Initialization
    → Runtime Activation
    → Reset / Dispose
```

World 的導覽出口是 Router 與 Page；Game 的對應機制則比較接近 Scene Director、Scene Manager 或 Game State Machine。這個差異不應被強行抽象成同一個 Router。

### 1.6 最外層是 Web App，Game 在進入遊戲時才開始

由於這是網頁遊戲架構，最外層不是 `game.js`，也不是遊戲引擎，而是瀏覽器中的 Web App。ModuCore World 可以在網頁啟動時完成平台 Boot，但 Game Runtime 不應因此立即啟動。

`game.js` 的真正運行起點，是 World 與目標 Project 已完成必要啟動後，進入遊戲頁面、遊戲區域或某個明確的 Game Entry 時。Game Entry 可以是使用者之後主動點擊，也可以由遊戲 URL 預先選定，並在 World 與 Project 就緒後自動成立。

這裡必須區分「選定意圖」與「實際執行」：瀏覽器一開始就可以從 URL 知道目標 Project 與 Game，但 Project Runtime 不應在 World 準備完成前執行，Game Runtime 也不應在 Project 安裝與註冊完成前啟動。

執行順序應保持為：

```text
Browser 載入 URL／取得目標意圖
    ↓
World Boot 完成
    ↓
Project Entry 執行／Project Modules 安裝與註冊完成
    ↓
Game Entry 成立
    ↓
Game Boot
    ↓
Game Start／Engine Loop
```

核心不變量是：

```text
World Ready → Project Ready → Game Ready → Game Running
```

Game 可以選擇在 Project Ready 後立即自動啟動，但不可超越 World 與 Project 的生命流程順序。

```text
Browser / Web App                     最外層運行環境
└── ModuCore World                  網頁平台與 Host Context
    └── Project Runtime              World Ready 後才執行
        ├── Router / Pages           網頁導覽
        ├── 其他專案模組          非遊戲功能
        └── Game Page / Game Entry   Project Ready 後才成立
            └── Game Host Adapter    掛載點與進出契約
                └── game.js          此時才 boot / start
                    ├── Game Session
                    ├── Scene Flow
                    └── Engine Loop
```

因此應區分四個時間點：

1. **Web App 與 World 啟動**：建立網頁應用並完成 ModuCore World Boot，此時可能完全沒有 Game Runtime。
2. **Project 執行**：在 World Ready 後進入目標 Project，完成 Project Modules、Pages 與 Game Entry 的安裝或註冊。
3. **進入遊戲**：在 Project Ready 後，Game Entry 透過穩定契約建立 `game.js`、掛載 Canvas、執行 Game Boot 並啟動 Engine Loop。
4. **離開遊戲**：停止 Engine Loop，銷毀 Game Session、Scene、Canvas 與訂閱，但 Web App、ModuCore World 與視設計而定的 Project Runtime 可以繼續運作。

Game Page 是進入遊戲的入口與 DOM 承載邊界，但不應自行實作 Scene、Store 或 Engine 內部邏輯。可由一個薄的 Game Host Adapter 將 Page 掛載／卸載事件轉成 Game Runtime 的 `boot()`、`start()`、`stop()` 與 `destroy()`。

目前可保留三種啟動策略：

| 策略 | 觸發時機 | 適合情境 |
| --- | --- | --- |
| Direct Entry | 開啟遊戲 URL 後，依序完成 World Boot 與 Project Entry，接著自動建立並啟動 Game Runtime | 單一遊戲網站、獨立遊戲連結 |
| Portal Entry | 先進入遊戲目錄或網站，使用者選擇遊戲後才啟動 | 多遊戲平台、入口大廳 |
| Embedded Entry | 特定 Page 或元件掛載時啟動，卸載時銷毀 | 網站中的小遊戲、活動或互動區塊 |

這三種策略不應改變 Game Runtime 內部架構；差異只在於哪一個 Host 事件呼叫 `game.boot()` 與 `game.start()`。因此本文目前不裁決一進入網址就自動運行，或必須等使用者點擊才運行。

#### 1.6.1 Direct Entry 可以營造「獨立遊戲網址」的感受

Direct Entry 具有明確的產品價值：當使用者點開特定網址後直接進入遊戲，對外體驗會像是一個只承載單一遊戲的獨立網站。使用者不需要知道內部仍先執行了 World Boot 與 Project Entry。

```text
使用者看到：
遊戲 URL → 載入畫面 → 直接遊戲

系統內部實際執行：
遊戲 URL
  → World Boot
  → Project Entry
  → Game Boot
  → Game Start
```

這種方式同時保留：

- 每款遊戲獨立、可分享、可收藏的直接網址。
- 使用者對「這個網址就是這款遊戲」的直覺。
- ModuCore 内部一致的 World 與 Project 生命流程。
- 未來可選的 Portal，但不強迫玩家每次都經過入口大廳。
- 離開或切換到另一款遊戲時，仍可利用 Page Reload 得到乾淨的 Runtime 邊界。

因此，Direct Entry 可以成為單一遊戲專案或多遊戲平台中的首選對外入口，但它仍是 Entry Policy，不改寫內部的生命流程順序。

### 1.7 `game.js` 與 `world.js` 的邊界結論

本構思目前採用的架構方向，是以 `game.js` 或等價物作為 Game Runtime Facade，統一協調遊戲生命流程、Game Store、Scene Service 與 Engine Adapter；它不直接掛成 `world.js` 的內部功能集合，也不要求 `world.js` 代理遊戲方法。

判斷二者關係的依據不應是檔案大小或程式碼數量，而是：

- 誰擁有遊戲的 boot、start、pause、stop 與 destroy 生命流程。
- Game Runtime 是否能離開 Vue / React Page 獨立測試與運行。
- 沒有遊戲的 Project 是否仍能完整使用 `world.js`。
- World Reset 與 Game Destroy 之間由誰協調，但不把兩者混成同一個生命週期。

目前方向是將 `game.js` 設計為 **由 World 承載、但可獨立運行的 Game Runtime**：World 只負責透過 Game Entry、Runtime Factory 與 Host Contract 讓它被合法建立、掛載及清理。具體 API 與實作位置仍待原型驗證，但責任邊界不再以 `world.game.*` 作為預設。

### 1.8 World 是承載遊戲的薄膜

目前討論越來越傾向將 ModuCore World 理解為承載 Game Runtime 的薄膜或 Host Boundary。World 不必擁有大量遊戲邏輯，其核心價值是提供穩定邊界：

- Project 與 World 身份。
- Container 與能力註冊。
- Module 發現、可見性與安裝。
- Router、Page 與 UI Framework 的掛載環境。
- API、存儲、系統服務與重置邊界。
- Game Runtime 進入、離開與清理時的交接契約。

這項關係可以凝聚成一條核心邊界宣言：

> **World 提供承載能力，Game 自己形成完整的運作體系，兩者不互相侵入。**

`game.js` 的「組合」不表示它自行實作所有子系統，而是由它作為 Facade 與 Lifecycle Coordinator，依 Game Definition 取得、註冊、啟動、重置並清理所需能力。架構中的兩種「池」必須沿用下列邊界：

- **功能池**：指 Registry 內可供 Factory 查找與組合的 Capability Definitions，不另建立 CapabilityPool 核心。
- **物件池**：指按遊戲規模或效能需求選用的 Object Pool，可由 Service、Engine Adapter 或其他適當模組提供，不是所有 Game Runtime 的強制組件。

```text
ModuCore World
└── 承載／卸載 Game Runtime
        │ Host Contract
        ▼
game.js（Facade / Lifecycle Coordinator）
└── 私有 Game Container
    ├── Registry
    │   ├── Entity Definitions
    │   └── Capability Definitions（功能池）
    ├── Factory
    ├── Object Pool（按需求選用）
    ├── Stores
    ├── Services
    ├── Systems
    └── Engine Adapter
```

這張圖是目前架構方向的濃縮描述，仍不代表各候選元件已實現或已成為正式 ModuCore 架構規格。

「不互相侵入」不表示兩者完全隔絕，而是所有交接都必須經過明確契約：World 透過 Host Contract 提供 Game 被允許使用的平台能力，Game 透過 Runtime Factory、Lifecycle Hook 或對外 Facade 回報其可被承載的行為。World 不吸收玩家、Entity、Scene、引擎或遊戲規則；Game 也不接管 Project、Router、平台權限、World Container 或 World Lifecycle。

```text
World
├── 提供承載環境與公開 Host Contract
├── 決定 Game 何時可以被建立、掛載與要求清理
└── 不進入 Game 的內部運作體系
        │ 契約交接
        ▼
Game
├── 自己形成 Lifecycle、Container、Store、System、Scene 與 Engine 體系
├── 在被授權的範圍內使用 Host 能力
└── 不反向侵入 World 的內部責任
```

因此，兩者的理想關係不是父層持續控制子層所有細節，也不是 Game 複製一套平台核心，而是由 World 承載一個內部完整、可獨立演化且可完整銷毀的 Game Runtime。

從世界觀角度來看，World 可以被理解為「設定宇宙情境與存在邊界」的上下文；Game 則是在這個情境中被建立、開始運作、可被暫停與終止的具體實作世界。

```text
World Context：宇宙情境、存在條件、能力邊界
        ↓ 承載與授權
Game Instance：實際存在且正在運作的遊戲世界
        ↓ 展開
Scene：遊戲世界中當前被載入的局部空間或階段
        ↓ 驅動
Engine Loop：讓具體世界持續運作的執行機制
```

這使生命流程邊界變得更清楚：

- World 可以存在，但 Game 尚未被建立或尚未啟動。
- Game 可以被銷毀或重建，而不一定要同時銷毀整個 World Context。
- Scene 可以不斷切換，但 Game Instance 與其跨場景資料仍存在。
- Engine Loop 可以暫停，但 Game Instance 不必因此消失。

因此，`world.js` 不需要理解玩家、NPC、任務或戰鬥；它只需要知道 Game Runtime 是一個可被注入、啟動、重置與清理的受承載系統。`game.js` 則不需要接管 Project、Router 或平台權限；它只專注於具體遊戲現實的建立與運作。

Game Runtime 才承擔實際遊戲世界的複雜度：

- Game Lifecycle。
- 場景、地圖與關卡。
- 玩家、NPC、背包、任務、戰鬥與經濟系統。
- 遊戲時間、事件、規則與模擬系統。
- Engine Adapter、Scene Service 與各類 Game System。
- 存檔映射與遊戲進度。

因此，在中小型遊戲中，Game Runtime 的結構、程式碼與生命流程大於 World 層，是合理而且可預期的。World 較小不表示它不重要；它像薄型核心或承載層，負責邊界穩定，而不是吸收被承載系統的所有複雜度。

```text
ModuCore World（薄型 Host）
├── Project / Identity
├── Container / Registration
├── Module / Page / Router
├── API / Platform Services
└── Game Runtime Contract
    │
    └── Game World（主要複雜度所在）
        ├── Lifecycle
        ├── Systems
        ├── Scenes
        ├── State
        ├── Engine Adapter
        └── Save / Progress
```

上圖的「Game World」是遊戲領域世界的描述用語，不表示建立第二個 ModuCore World 實例。若後續命名容易與現有 World 治理語意混淆，可在實作層改用 `Game Runtime` 或 `Game Domain`。

這個方向也意味著 `game.js` 不應演變為一個包含所有遊戲邏輯的巨型檔案。`game.js` 應只是 Game Runtime 的 Facade 與生命流程入口，實際架構展開在獨立的 game runtime 目錄與內部子系統中。

以上是目前的明確傾向，尚需透過最小原型驗證 World 與 Game Runtime 的契約，並不代表已實作或已升格為正式 World 規則。

#### 1.8.1 與現行 ModuCore World 語意的關係

現行 ModuCore 正式文件將 World 定義為可執行的系統實例，而不只是靜態藍圖。因此，目前可先採取的相容解讀是：

> World 仍是正在運行的 Host Context，但不承擔遊戲領域模擬；Game Instance 是 World 內被承載的具體遊戲現實。

若未來要將正式 World 重新定義為「僅是靜態宇宙藍圖」，那將不只是 Game Runtime 的實作選擇，而是對現有 World Model 與 Lifecycle 的語意變更，需另行經過正式變更流程。本文目前不做這項正式裁決。

```text
World 語意邊界
├── world.js                         平台 World Facade
├── Container                        能力註冊與取得邊界
└── Game Runtime（game.js）         可獨立測試與演化的遊戲運行子系統
    ├── Game Stores                  長期與跨場景狀態
    ├── Scene Service                場景協調，切換與清理策略待驗證
    ├── Engine Service               引擎啟動、暫停、恢復與結束
    └── p5.js / Game Engine Loop     保留引擎自身循環
```

這個分層讓 ModuCore 的平台生命週期、遊戲執行生命週期與畫格循環可以明確分開：

```text
World Lifecycle ≠ Game Lifecycle ≠ Frame Loop
```

目前已確認的是 Game Lifecycle 應由 Game Runtime 獨立負責，並由 World 透過明確契約承載；`game.js` 的具體公開介面、檔案位置與啟動細節仍待驗證，也不代表 Game Runtime、Scene Service 或相關生命週期已實現。

目前的概念對應為：

| ModuCore 概念 | 網頁遊戲中的可能對應 |
| --- | --- |
| `World` | 承載遊戲的 Host Context，定義宇宙情境、身份、能力與模組邊界 |
| `Project` | 一款獨立遊戲或其專案組態 |
| Game Instance | 在 World Context 中被建立並實際運作的遊戲世界 |
| `Module` | 可組合的遊戲功能或場景模組 |
| `Pages` | 由模組對外提供的場景入口或承載遊戲畫布的頁面 |
| World Container | Web App、World 與 Project 層能力的註冊與取得邊界 |
| Game Container | 候選的 Game Instance 私有能力範圍，生命週期跟隨 Game Runtime |
| Store / Service | 玩家、進度、背包、音效、存檔等資料或能力 |
| `world.js` | 整個平台 World 的執行時 Facade |
| `game.js` | Game Runtime Facade 與生命流程協調器；由 World 承載但不併入 `world.js` 內部責任 |
| p5.js / Game Engine | 保有自身畫格循環與場景內運行邏輯 |

`Pages` 與遊戲場景可以建立對應，但不必視為同一個物件。例如 Vue 或 React 的 Page 可以負責路由、掛載與 UI 外殼，p5.js 或其他引擎則負責場景內部的遊戲運行。

## 2. Game Module 的內容組織

遊戲模組可先分為兩類：

```text
Game Runtime
├── 共用模組
│   ├── Player
│   ├── Inventory
│   ├── Equipment
│   ├── Audio
│   └── Save
│
└── 場景模組
    ├── MainMenu
    ├── Village
    ├── Forest
    ├── Dungeon
    └── Battle
```

### 2.1 共用模組

共用模組承擔跨場景使用的資料或能力。當玩家從村莊移動到森林或地下城時，玩家資料、背包、裝備與進度不應因場景畫面被卸載而消失。

### 2.2 場景模組

場景模組承擔特定場景的內容、互動與局部資源。它可以使用共用模組提供的能力，但不需自行建立另一份玩家或背包狀態。

這種分離使場景可以替換、組合或移除，同時降低共用功能對特定場景的依賴。

### 2.3 Scenes 與 Systems 的責任差異

Game Architecture 內部還需要區分「場景如何組織內容」與「遊戲規則如何運作」：

- **Scenes**：組織特定空間或階段中的內容，例如西門町、台北車站、室內商店；決定該場景載入哪些物件、資源、觸發點與 Systems。
- **Systems**：實作可跨場景運作的遊戲規則與行為，例如交通、NPC AI、戰鬥、任務觸發。

```text
Scene：西門町
├── 載入地圖、建築、NPC 與場景資源
├── 啟用 Traffic System
├── 啟用 NPC AI System
└── 啟用 Mission Trigger System

Scene：台北車站
├── 載入車站空間、乘客與場景資源
├── 重用 NPC AI System
└── 重用 Mission Trigger System
```

候選的依賴方向是 Scene 組合或啟用 System，而 System 不應直接綁定單一 Scene。某些高度場景專屬的規則是否仍應做成局部 System，需在實作時依重用性與生命週期判斷。

## 3. Game Container、Registry 與反向註冊

容器模型已經過「共用 World Container」、「Child / Scoped Container」與「私有 Game Container」三種方向比較。本文目前採用的候選方向，是由 Game Runtime 擁有獨立的私有 Game Container，並透過 Host Contract 取得被允許的平台能力。

效能不是這項選擇的主要因素。Container 主要是能力註冊與取得通道，真正的判斷依據是：

- World 與 Game 的生命週期是否一致。
- Game Destroy 時能否一次清除所有遊戲能力。
- Game 能力是否會污染 World 命名空間或留下過期實例。
- AI 與開發者能否從容器邊界直觀理解責任所屬。
- Game Runtime 能否在不啟動完整 Web App 的情況下獨立測試。

### 3.1 容器模型的比較背景

| 模型 | 說明 | 優點 | 風險 |
| --- | --- | --- | --- |
| 共用 World Container | 所有 Game Store 與 Service 直接註冊到現有容器 | 最簡單，現有取得通道可直接重用 | World 與 Game 生命週期綁定，清理、命名與重建邊界比較模糊 |
| Child / Scoped Container | Game Container 以 World Container 為 parent，可向上取得能力 | 方便重用 Host 能力，同時保有 Game Scope | 容易產生隱性回透依賴、同名覆寫與邊界不清 |
| 私有 Game Container＋Host Contract | Game Runtime new 獨立容器，只注入明確允許的 World 能力 | 生命週期、命名、測試與 AI 邊界最清楚 | 需設計 Host Contract 與銷毀契約，也要避免無意義複製 World 能力 |

### 3.2 目前架構方向：私有 Game Container

由於 World 在 Web App 運行期間可以持續存在，Game Runtime 卻可能反覆建立與銷毀，兩者生命週期不同。因此，目前較值得優先驗證的是：

```text
World Container（Web App / World 生命週期）
├── Project 與平台能力
├── Game Entry / Runtime Factory
└── Game Host Contract
        │ 明確注入
        ▼
Game Container（Game Runtime 生命週期）
├── Game Lifecycle
├── Game Stores
├── Game Systems
├── Scene Service
└── Engine Adapter
```

World Container 只註冊 Game Runtime 的「入口能力」；進入遊戲時，Game Runtime 再 new 一個私有 Game Container。離開遊戲時，先執行 Game Lifecycle 清理，再一次 dispose 整個 Game Container，World Container 則不受影響。

這個邊界也比較符合理解直覺：

- World Container 是 Web App 與 ModuCore World 的能力邊界。
- Game Container 是某一個 Game Instance 的能力邊界。
- Game 可以完整銷毀後重建，不留下過期 Store 或 Service。
- 只有 Host Contract 中的能力可以從 World 進入 Game。
- Game 內部重構不會擴大 `world.js` 或 World Container 的責任。

### 3.3 反向註冊仍保留

獨立 Game Container 不會改變原本的反向註冊哲學。每個遊戲模組仍只負責宣告自己提供的狀態與能力，只是註冊目標變成該 Game Instance 所擁有的 Game Container。

```text
Player Module     ─┐
Inventory Module  ─┤
Audio Module      ─┤──▶ Game Container
Save Module       ─┤
Scene Modules     ─┘
```

概念上，例如 `Inventory Module` 只需註冊背包相關狀態與操作，無須事先知道會有哪些場景使用它。場景需要背包能力時，再從同一個 Game Container 取得。

目前仍不預設每個 Scene 都 new 一個完整 Container。若後續實作證明 Game Session 或 Scene 也需要獨立 Scope，再依 Reset Scope 設計更小的子作用域，不在現階段預先建立。

以上是優先驗證方案，不代表現有 ModuCore 已支援 Child Container、Scoped Container 或 Game Container API。

### 3.4 Entity 與 Capability Definition 的反向註冊（候選）

Game Module 除了註冊 Store、System 與 Service，也可以宣告 Player、NPC、Vehicle、Building 等遊戲物件定義。本文統一以 `Entity Definition` 稱呼這類可供後續建立實例的描述；早期討論中的 `Object Definition` 指的是相同概念，不是 JavaScript prototype，也不是已存在的引擎物件。

Entity Definition 在語意上註冊到 Game Container 邊界，但實際保存形式由註冊於 Game Container 的 `Game Registry` 統一負責。這可避免每一種定義都被誤解為長期 Service，也讓定義查找、重名處理、來源追蹤與相容性驗證保有集中邊界。

隨著能力組合概念加入，現有 Registry 還可以在同一責任邊界內保存兩類定義：

- **Entity Definitions**：描述 pedestrian、police、merchant 等物件需要哪些能力與初始設定。
- **Capability Definitions**：描述 position、movement、health、combat、ai、dialogue、trade 等可被組合的能力，以及其候選建立方法與生命週期資訊。

本文將這個整體邊界稱為 `Game Registry`；早期文中的 `Object Registry` 可視為其中的 Entity Definition 註冊責任或舊稱。所謂「能力池」只是對 Capability Definitions 集合的概念描述，**不因此新增一套 CapabilityPool 核心、第二個 Registry 或額外 Container**。

```text
Game Module
├── 宣告 Player Definition
├── 宣告 NPC Definition
├── 宣告 Vehicle Definition
└── 宣告 Building Definition
        │ 反向註冊
        ▼
Game Container
├── Game Registry
│   ├── Entity Definitions
│   └── Capability Definitions
├── Entity Factory
├── Game Stores
└── Game Services
```

此處至少必須區分五個階段：

1. **Capability Registration**：Game Boot 發現模組並登錄能力定義，不立即建立所有能力實例或載入所有資源。
2. **Entity Definition Registration**：登錄物件需要的能力清單與初始設定，尚未建立實際物件。
3. **Instance Creation**：Scene、System 或其他合法呼叫者提出建立需求時，Factory 才解析定義並建立實例。
4. **Capability Activation / Execution**：完成初始化後，由 System、Engine Adapter 或其他合法執行者啟用與執行能力。
5. **Dispose**：依所有權與生命週期解除能力、事件、引擎物件及相關資源。

因此，註冊一個 NPC Definition 不應立即產生大量 NPC。Game Registry 保存的是「可以如何建立」的定義或索引，不是目前場景中所有實例的集合。

目前尚未裁決 Entity Definition 應包含哪些欄位、是否允許繼承或組合、如何覆寫，以及定義應直接成為 Container Entry，或只存在於 Registry 內部。以上名稱與分層均屬候選設計，不代表已有對應 API 或實作。

### 3.5 物件是能力的組合（候選）

延續反向註冊哲學，Entity 不必先繼承一棵龐大的類別樹，Entity Definition 可以透過能力清單表達建立時需要的組合：

```javascript
const entities = {
  pedestrian: ['position', 'movement', 'render'],
  police: ['position', 'movement', 'render', 'health', 'combat', 'ai'],
  merchant: ['position', 'render', 'dialogue', 'trade'],
}
```

上述程式只用於表達候選模型，不是正式資料格式。候選流程如下：

```text
Game Modules
├── Position
├── Movement
├── Health
├── Combat
├── AI
├── Dialogue
└── Trade
        │ 反向註冊
        ▼
Game Registry（概念上的能力池）
        │ 查找能力定義
        ▼
Entity Definition（能力清單）
        │
        ▼
Entity Factory（解析與組合）
        │
        ▼
Entity Instance
        │
        ▼
Engine Adapter
        │
        ▼
遊戲引擎執行
```

Factory 的責任是根據 Entity Definition 查找並組合已註冊能力，而不是把所有能力硬編碼進 `game.js`。但「能力」目前仍是上位語意：它可能對應 Component 資料、初始化／清理 Hook、共享 Service、System 的處理資格，或 Engine Adapter 所需描述。最終 Capability Definition 的最小契約仍待驗證，不應現在就把所有能力都實作成相同形態的物件。

## 4. 遊戲狀態的所有權

`Game Container` 中的遊戲狀態應與系統層 Vue / React 狀態分開。

- Vue / React 狀態適合管理網頁外殼、路由、面板開關、對話框與其他 UI 呈現狀態。
- 遊戲狀態則由遊戲專屬的 Store / Service 管理，例如玩家屬性、位置、背包、任務進度與存檔資料。

這不表示兩者完全不能互動，而是互動應透過清楚的介面或適配層進行，避免把遊戲狀態的生命週期綁定到某個 UI 元件。

## 5. Frame Loop 與持久資料生命週期

p5.js 的 `draw()` 可能每秒執行多次，其職責應以讀取當前遊戲狀態、更新畫面與驅動引擎內部步進為主。玩家、背包與進度等持久資料，不應在每次 `draw()` 中重新建立，也不應因畫布重畫而改變實例生命週期。

```text
Game Container
├── Player Store      ─────────────────────┐
├── Inventory Store   ── 跨畫格、跨場景存在 ─┤
└── Progress Store    ─────────────────────┘

p5.js / Engine Loop
└── setup() → update() → draw() → next frame
```

因此，「高頻執行的引擎循環」與「長期存在的遊戲資料」應是兩個不同層次的問題。

## 6. Engine Adapter 與遊戲引擎邊界

ModuCore 可以負責組合模組、建立或提供容器，並協調頁面與場景入口；但不應因此取代 p5.js 或其他遊戲引擎的核心循環。

遊戲引擎仍應負責：

- 畫格更新與繪製。
- 輸入、碰撞、動畫或物理等引擎層工作。
- 場景內部、需要在每幀更新的短期狀態。

ModuCore 與引擎的邊界可先概括為：

```text
ModuCore：模組組合、註冊、長期狀態、服務取得
Game Engine：循環、場景運行、畫格更新、輸入與繪製
UI Framework：網頁外殼、路由、面板與 UI 呈現
```

### 6.1 邏輯物件建立與多引擎適配（候選）

為了讓 `game.js` 保持統一入口，又不吸收各引擎的建立細節，可以先區分兩種工廠責任：

- **Entity Factory**：解析 Entity Definition 與建立選項，建立遊戲領域中的邏輯實例或建立描述。
- **Engine Adapter Factory**：依目前使用的引擎建立或選擇對應 Adapter，再由 Adapter 將邏輯實例連接到引擎特有的視覺、物理或場景物件。

```text
ModuCore World
└── Game Runtime（game.js）
    ├── Game Container
    │   ├── Game Registry
    │   │   ├── Entity Definitions
    │   │   └── Capability Definitions
    │   ├── Game Stores
    │   └── Game Services
    │
    ├── Entity Factory
    │   └── 建立遊戲邏輯物件
    │
    ├── EntityManager（候選）
    │   └── 管理遊戲物件實例
    │
    └── Engine Adapter Factory
        ├── P5Adapter
        ├── ThreeAdapter
        └── PhaserAdapter
```

上圖僅表示概念責任，不表示目前已有這些類別、介面或檔案。實際引擎名稱也只是用於比較不同適配需求。

跨引擎共用 Entity Definition 是設計目標，但不表示同一份定義必然能在 p5.js、Three.js 與 Phaser 間完全不經調整直接運行。各引擎對座標、資源、場景樹、生命週期、物理與銷毀方式的模型不同，差異應由引擎適配層明確承接，而不是藏進 `game.js` 或通用 Entity Factory。

### 6.2 Container、EntityManager 與引擎的實例所有權

Game Container 適合保存生命週期較穩定的定義、Factory、Store 與 Service，但不必把每一個 NPC、車輛或建築實例都註冊為 Container Service。大量且頻繁建立、銷毀的遊戲物件，應交由更符合其生命週期的管理者處理。

同理，Game Container 不需要為每個 Entity 建立獨立 Container。除非後續出現明確且無法由 Entity 狀態、Scene Scope 或引擎生命週期處理的隔離需求，否則不增加這種管理層級。

目前可先用下列責任分界作為比較基準：

| 責任 | 候選擁有者 |
| --- | --- |
| 保存與查找 Entity / Capability Definition | Game Registry |
| 依定義解析並組合能力 | Entity Factory |
| 追蹤活著的遊戲邏輯實例 | EntityManager 或引擎既有管理機制 |
| 批次執行符合條件的遊戲規則 | Systems 或引擎既有更新機制 |
| 建立渲染、物理或場景節點 | Engine Adapter |
| 管理引擎資源與引擎物件銷毀 | Engine Adapter 或引擎既有管理機制 |
| 協調建立入口與生命流程 | `game.js` |

`EntityManager` 目前只是候選角色。如果選定的引擎已能完整管理 Entity、Scene Object 或 Game Object，Game Runtime 不應為了形式一致而重做一套平行管理器。只有在跨引擎邏輯實例追蹤、Reset Scope、存檔映射或測試隔離確實需要共同管理層時，才應考慮建立通用 EntityManager。

核心原則是：**ModuCore Game Runtime 負責能力組合、註冊與生命週期協調；遊戲引擎負責其擅長的物件執行、渲染與物理工作。**

### 6.3 與 ECS 的關係（候選）

反向註冊、Registry、Factory 與能力組合，和 ECS（Entity Component System）具有相似思想，但目前不等同於採用完整 ECS Framework。

典型 ECS 可先區分為：

- **Entity**：遊戲物件的身分。
- **Component**：Entity 各自持有的資料，例如 Position、Health、Velocity。
- **System**：集中處理符合條件的 Entities，例如 MovementSystem、CombatSystem、AISystem。

這項區分對大量物件尤其重要。即使 10,000 個 NPC 都具有移動能力，也只需各自保存 Position、Velocity 等必要狀態，不應因此各自建立一份完整的 MovementSystem。較合理的候選方向是由共享 MovementSystem 批次處理具有所需 Components 或能力標記的 Entities。

ModuCore Game 可以吸收 ECS 的能力組合、資料分離與集中更新思想，同時保留 Module 反向註冊、Game Registry、Factory、生命週期與 Engine Adapter 邊界。是否需要完整 ECS、僅採用部分模式，或直接使用遊戲引擎提供的 ECS，應由原型與實際規模決定。

### 6.4 Capability Definitions 與 Object Pool 不同

能力池與物件池解決的是不同問題：

| 概念 | 保存內容 | 主要目的 |
| --- | --- | --- |
| Capability Definitions（概念上的能力池） | Game Registry 內的能力定義、註冊資訊或建立方法 | 讓 Factory 查找、選擇與組合能力，提升擴充性與模組重用 |
| Object Pool | 可重複使用的物件實例或資源 | 減少頻繁建立與銷毀的成本 |

兩者可以共存，但 Object Pool 只是可選的 Game Service、Engine Adapter 內部策略或其他適當模組，不必成為所有 Entity 的共同前提，也不應放進 Registry 取代 Definition。

針對大量遊戲物件，還可以視需求評估：

- **Object Pool**：重用高頻建立與銷毀的物件或資源。
- **Batch Update**：由 Systems 集中更新符合條件的 Entities。
- **Spatial Index**：透過空間分區降低附近物件與碰撞候選查詢量。
- **ECS / Data-Oriented Design**：改善大量同類資料的存取布局與更新流程。

這些都是執行層的候選效能策略，不是初期架構必須全部實作的核心功能。實際選擇應依遊戲規模及 p5.js、Three.js、Phaser 等引擎現有能力決定。

這一階段的核心結論可以整理為：

> **ModuCore Game 以能力註冊為基礎，以 Factory 進行物件組合，以 Systems 或引擎執行遊戲規則。保留核心簡單性，讓能力自由組合，並把效能優化留給真正需要的執行層。**

## 7. `game.js`、Game Lifecycle 與 Reset Scope

可以參考現有 `world.js` 的 Facade 思路，建立一個 `game.js` 作為遊戲執行層的統一入口。「參考 Facade 思路」不等於「必須掛在 `world.js` 之下」；`game.js` 可以是在 World 語意邊界內獨立發展的 Runtime 子系統。

```text
World 語意邊界
├── world.js
│   └── 平台啟動、能力取得與 World Reset
│
└── game.js / Game Runtime
    ├── 提供遊戲狀態與能力的取得入口
    ├── 管理 Game Lifecycle
    ├── 協調場景生命週期
    ├── 啟動、暫停、恢復與停止遊戲引擎
    └── 連接 Game Store 與 p5.js
```

### 7.1 Game 對 World 世界觀與生命流程的借鏡

World 世界觀與 Boot 流程可作為 Game Architecture 的參考模型。這是單向的設計借鏡：Game 學習 World 如何先定義邊界、存在條件、能力註冊與生命階段，再依遊戲領域建立自己的具體模型。

`ModuCore_Game` 不是 World Lifecycle 的子類別，World Boot 也不是 Game Boot 必須實作的介面。Game 可以依領域需求重新命名、拆分、合併、調整順序或省略不適用的階段。

在世界觀層面，Game 可借鏡的不是 ModuCore 的具體條文，而是其建模方法：

| World 建模思路 | Game Architecture 可建立的對應文件或問題 |
| --- | --- |
| Purpose | 這套 Game Runtime 為何存在，不處理什麼 |
| Model | Game、Session、Run、Scene、System、Entity 與 Engine 分別是什麼 |
| Boundaries | 哪些責任屬於 Game，哪些必須留在 ModuCore 或 Engine |
| Lifecycle | Game 如何 boot、start、pause、reset、stop 與 destroy |
| Output Definition | Game Module 可以輸出哪些 Store、System、Scene 與 Service |
| Structure and Naming | Game Architecture 內部目錄、命名與入口如何保持可理解 |
| Change Protocol | AI 或人類要變更 Game Architecture 時如何留下邊界與決策記錄 |

在 Boot 層面，下列對照只用於發現可借鏡的思考，不是一對一的實作要求：

| 共通階段 | World Boot 中的意義 | Game Boot 中的可能對應 |
| --- | --- | --- |
| Definition Resolution | 解析 Project 與 PlatformConfig | 解析 Game Definition、Game Config 與初始存檔選擇 |
| Core Boot | 建立 World 核心能力 | 建立 Game Runtime Core、Lifecycle 與 Engine Adapter |
| Base Context | 建立 World 身份與基礎環境 | 建立 Game Session、玩家初始投影與運行情境 |
| Module Discovery | 發現 Project Modules | 發現 Game Systems、Scene Modules 與共用遊戲模組 |
| Eligibility Evaluation | 評估可見性與存取條件 | 評估遊戲模組啟用條件、兼容性、模式與關卡需求 |
| Capability Registration | 將合法能力註冊到 Container | 將 Entity / Capability Definition、Game Store、System、Scene Service 與 Engine Service 註冊到 Game Container 邊界 |
| Module Initialization | 執行 Module init | 初始化 Game Systems、載入必要資源並準備初始 Scene |
| Runtime Activation | 建立可使用的平台 World | 啟動 Game Session 與 Engine Loop |
| Reset / Dispose | 執行 World Reset 與模組清理 | 依 Reset Scope 重置 Run、Scene 或銷毀 Game Runtime |

可借鏡的核心語法是：

```text
發現 → 評估 → 註冊 → 初始化 → 啟動 → 重置／銷毀
```

但以下責任不應直接視為同一物件：

- World Router 處理 URL、Page、存取與網頁導覽。
- Game Scene Flow 處理場景、過場、關卡、遊戲狀態轉移與資源交接。
- World 的可見性評估可能涉及使用者身份與平台權限。
- Game 的 Eligibility 比較偏向遊戲模式、存檔、關卡、功能開關與系統兼容性。

目前建議是：**借鏡 World 的世界觀建模方法與生命流程哲學，但讓 Game 保留自己的語意、文件與獨立實作。** `ModuCore_Game` 不應直接匯入 World Boot 的私有實作，也不應為了共用程式碼而要求重構原有 ModuCore Boot。本構思也不預設未來一定需要抽出共用 Lifecycle Protocol。

### 7.2 責任定位

`game.js` 的責任應是統一門面與遊戲生命流程協調，而不是自行保存所有遊戲狀態。玩家、背包、進度與場景等資料，仍由對應的 Store 擁有。

```text
game.js
├── Game Container
├── Game Registry / Entity Factory
├── Stores / Services / Systems
├── Scene Service
└── Engine Adapter
```

`game.js` 可先提供下列類型的介面：

- `store(name)`：取得已註冊的遊戲 Store。
- `service(name)`：取得已註冊的遊戲 Service。
- `create(type, options)`：候選的物件建立入口；委派給 Game Registry、Entity Factory 與 Engine Adapter，不在 Facade 內實作物件細節。
- `boot()`：解析遊戲能力、準備引擎與初始資源。
- `start()`：進入初始場景並啟動遊戲引擎。
- `changeScene()`：協調場景切換。
- `pause()` / `resume()`：調整引擎運行狀態。
- `stop()`：停止目前遊戲運行，但是否保留可恢復狀態仍待定義。
- `destroy()`：結束引擎實例、解除訂閱並觸發必要的清理流程。

概念介面如下：

```javascript
export function createGame({ container }) {
  let engine = null
  let phase = 'idle'

  return {
    get phase() {
      return phase
    },

    store(name) {
      return container.resolve(`game.store.${name}`)
    },

    service(name) {
      return container.resolve(`game.service.${name}`)
    },

    async boot(options) {
      phase = 'booting'
      engine = this.service('engine')
      await engine.prepare({ game: this, ...options })
      phase = 'ready'
    },

    start(options) {
      const result = engine.start({ game: this, ...options })
      phase = 'running'
      return result
    },

    changeScene(sceneName) {
      return this.service('scene').change(sceneName)
    },

    pause() {
      const result = engine?.pause()
      phase = 'paused'
      return result
    },

    resume() {
      const result = engine?.resume()
      phase = 'running'
      return result
    },

    stop() {
      phase = 'stopping'
      const result = engine?.stop()
      phase = 'stopped'
      return result
    },

    destroy() {
      engine?.destroy()
      engine = null
      phase = 'destroyed'
    },
  }
}
```

以上程式僅用於表達責任邊界，並非目前已實現的 API。

若後續原型保留 `game.create('police', options)` 這類入口，其意義應只是統一協調：查找 Entity Definition 與 Capability Definitions、委派 Entity Factory 組合邏輯實例，再交由當前 Engine Adapter 建立引擎對應物件。`game.js` 不應因此知道每一種 Vehicle、NPC、能力或引擎節點的建構細節。

未來也可以評估在 Runtime 動態增減能力：

```javascript
const police = game.create('police')
police.add('swimming')
police.remove('combat')
```

這些 API 只供架構討論，不是正式介面。動態增減能力至少涉及依賴檢查、初始化順序、狀態保留、System 索引更新、引擎資源建立／釋放，以及失敗時是否能回復；在這些契約釐清前，不應假設所有能力都可安全熱插拔。

Entity Factory 與 Engine Adapter Factory 也不應合併為同一責任。前者處理遊戲領域物件的建立，後者處理引擎選擇與引擎特有適配；兩者是否都需要公開 Factory 介面，仍待原型驗證。

### 7.3 Game Lifecycle 的初步模型

`game.js` 可能需要維護一個明確的遊戲執行階段，使啟動、暫停、場景切換與結束不是一組零散的呼叫。

```text
idle
  ↓ boot()
booting
  ↓ 能力與資源準備完成
ready
  ↓ start()
running ⇄ paused
  │
  ├── changeScene() → switching → running
  │
  └── stop() → stopping → stopped

stopped
  ├── start() → running      是否允許重啟待驗證
  └── destroy() → destroyed

任一階段失敗 → error → 回復或 destroy
```

上述階段名稱與轉移尚屬初步模型，需透過原型驗證。但其核心原則是：遊戲生命流程應有單一協調入口，不由 Page、p5.js `draw()` 或單一場景各自擅自啟停整個遊戲。

`game.js` 在生命流程中可能負責：

- 防止重複啟動、未完成啟動就切換場景，或銷毀後繼續更新。
- 排定 Store、Scene Service 與 Engine Service 的初始化與清理順序。
- 記錄當前 runtime phase，供 UI、除錯與測試判斷。
- 將生命流程錯誤統一轉成可辨識的失敗狀態。
- 在結束時停止 frame loop、解除事件、銷毀畫布，並交由各模組清理所擁有的資源。

需要區分兩類狀態：

- **遊戲資料狀態**：玩家、背包、任務與進度，由 Game Store 擁有。
- **遊戲運行階段**：`idle`、`running`、`paused` 等 runtime phase，可由 `game.js` 內部維護，或由專門的 Lifecycle Store 提供可觀察投影；最終形式待驗證。

#### 7.3.1 分層重置是 `ModuCore_Game` 存在的核心理由

瀏覽器重整可以非常乾淨地銷毀整個 JavaScript Runtime，適合用於不同遊戲之間的切換。但在單一遊戲內，玩家死亡重來、關卡重置、讀檔、返回主選單與新遊戲，都不是「全部清空」。它們需要保留某些狀態，同時重建另一些狀態。

這種「有範圍的重置」無法只依靠 Page Reload 表達，需要 Game Runtime 明確定義狀態的所有權與生命週期。

```text
持久層（Persistent）
├── 帳號、設定、成就、長期解鎖
│
遊戲局層（Game Session / Run）
├── 本次遊戲進度、玩家屬性、背包、任務
│
場景層（Scene）
├── 當前敵人、地圖實體、觸發器、場景資源
│
畫格層（Frame / Ephemeral）
└── 當幀輸入、碰撞結果、粒子、臨時計算
```

不同行為應有不同的 Reset Scope：

| 行為 | 保留 | 重置或銷毀 |
| --- | --- | --- |
| 暫停遊戲 | 所有遊戲狀態 | 暫停 Engine Loop 與部分輸入 |
| 玩家死亡重來 | 設定、成就與依遊戲規則保留的長期進度 | 當前 Run 或關卡狀態 |
| 關卡重試 | 玩家跨關卡資料與長期狀態 | Scene 實體、事件、計時器與資源 |
| 讀取存檔 | 平台身份與使用者設定 | 以存檔投影取代現有 Game Session |
| 返回主選單 | Game Runtime、帳號與設定 | 當前 Game Session 與 Scene |
| 開始新遊戲 | 帳號、設定與允許繼承的 Meta Progress | 舊的 Game Session / Run |
| 切換到另一款遊戲 | 由持久層明確保存的資料 | 可直接 Page Reload，銷毀整個舊 Runtime |

各款遊戲對「死亡後保留什麼」的規則不同，因此 `ModuCore_Game` 不應硬編碼唯一答案。它應提供可組合的 Reset Scope 與 Lifecycle Hook，讓遊戲模組宣告自己在不同重置階段的保留與清理行為。

因此，`ModuCore_Game` 的核心價值不是代替瀏覽器重整，而是提供：

- 可描述的 Game Lifecycle。
- 可組合的 Reset Scope。
- 各模組的清理與恢復 Hook。
- 可被測試的狀態轉移。
- 統一的 Store、Scene 與 Engine 協調邊界。

### 7.4 與 `world.js` 及 Container 的契約摘要

- `world.js` 仍是整個平台 World 的執行時 Facade。
- `game.js` 是 World 語意邊界內的遊戲 Runtime Facade，不是第二個 World。
- `game.js` 不一定是 `world.js` 的子物件；World Container 可只註冊 Game Runtime Factory 或 Entry Capability。
- `world.js` 不應為 `game.js` 代理每一個 Store、Scene 或 Engine 方法，以免平台 Facade 隨遊戲規模膨脹。
- `game.js` 可擁有私有 Game Container，並只透過 Host Contract 使用 World 明確注入的能力。
- Game Container 不應繞過 Host Contract 直接依賴 World Container 內部或其他模組私有實作。
- Game Container 是 Game Runtime 內部實例，不是與 World 並行的第二個 ModuCore 核心。
- Store 擁有狀態，`game.js` 不重複保存另一份副本。

遊戲模組仍可以透過反向註冊提供能力：

```javascript
gameContainer.register('player', playerStore)
gameContainer.register('inventory', inventoryStore)
gameContainer.register('scene', sceneStore)

gameContainer.register('engine', p5Engine)
gameContainer.register('sceneManager', sceneManager)
```

以上註冊名稱只是概念示意，實際命名與註冊介面仍需對照 ModuCore 現有實作驗證。

### 7.5 與 p5.js 及 UI Framework 的互動

p5.js 可以透過 `game.js` 取得當前遊戲狀態，但仍保留自己的 `setup()` 與 `draw()` 循環。

```javascript
function draw() {
  const player = game.store('player').get()

  background(30)
  circle(player.position.x, player.position.y, 30)
}
```

Vue 或 React 可透過適配層訂閱 Game Store，用於呈現 HUD、背包或設定面板；UI Framework 不因此成為遊戲狀態的擁有者。

`game.js` 是否應直接負責場景切換、卸載順序與資源清理，目前仍屬待驗證議題。可先將它定位為協調入口，具體工作交由 Scene Service 與 Engine Service 執行。

### 7.6 層級結論

容器模型的比較已集中於第 3.1 節。對生命週期而言，本文只保留一條主線：Game Runtime 由 World 承載，Game Instance 擁有私有 Game Container，但不因此建立第二個 ModuCore World 或第二個平台核心。其具體 API、清理契約與可行性仍須由原型驗證。

## 8. 端到端運行流程（候選）

以下僅為待驗證的概念流程：

1. Browser 載入 Web App。
2. `world.js` 完成平台 World 啟動與 Container 準備；此時不建立 Game Session，也不啟動 frame loop。
3. 在 World Ready 後，執行目標 Project 入口，完成 Project Modules、Pages、Routes 與專案能力的安裝或註冊。
4. Game Module 在 Project 邊界內提供 Game Entry、Runtime Factory 或等價入口，但實際遊戲尚未運作。
5. Entry Policy 成立：可能是遊戲 URL 在 Project Ready 後自動啟動，也可能是使用者從 Portal 進入 Game Page，或某個嵌入式元件完成掛載。
6. Vue / React Game Page 提供 DOM 掛載點，Game Host Adapter 從 World Container 取得 Runtime Factory 與 Host Contract，然後建立 Game Runtime Facade。
7. Game Runtime new 一個私有 Game Container，並注入 Host Contract 允許使用的平台能力。
8. `game.boot()` 解析 Game Definition、發現遊戲模組，將 Entity Definition、Capability Definition、Registry、Factory、Store、System、Scene Service 與 Engine Adapter 等候選能力註冊到 Game Container 邊界，並準備必要的初始資源；單純註冊不代表建立所有能力實例或載入所有相關資源。
9. Engine Adapter Factory 依 Game Definition 或啟動選項準備對應的引擎適配器；是否允許 Runtime 期間切換引擎仍待驗證。
10. `game.start()` 建立 Game Session、進入初始 Scene，p5.js 或其他引擎開始自身循環。
11. 運行期間由 `game.js` 協調 pause、resume、reset 與 changeScene；場景切換時保留跨場景狀態，並交由所屬模組清理舊 Scene 資源。
12. 使用者離開 Game Page 時，Game Host Adapter 呼叫 `game.stop()` 與 `game.destroy()`，停止循環、銷毀 Game Session、Scene、Canvas 與訂閱，最後 dispose Game Container。
13. Router 轉往其他網頁內容，Web App、ModuCore World 與 World Container 繼續存在。

遊戲物件的候選建立流程與 Game Boot 分開：

```text
Game Module
    ↓ 宣告 Capability / Entity Definition
Game Container / Game Registry
    ↓ 在建立需求發生時查找定義與能力清單
game.create('police', options)
    ↓ 委派
Entity Factory
    ↓ 組合能力並建立遊戲邏輯實例
Engine Adapter
    ↓ 建立引擎對應的視覺、物理或場景物件
EntityManager 或引擎既有管理機制
    └── 追蹤實例與負責後續更新／銷毀
```

這只是候選流程。實際實作可能由 Scene 或 System 直接呼叫 Factory，也可能由引擎建立主要實例後再回填領域映射；本文目前不裁決唯一方向。

## 9. 待驗證議題

### 9.1 場景切換機制

尚未確定場景切換應由 ModuCore Router、UI Router、遊戲引擎的 Scene Manager，或一個專門的協調層主導。需要先驗證：

- 網頁 Page 切換是否必然等同於遊戲 Scene 切換。
- 單一 Page 內是否可以運行多個 Scene。
- 切換過程中如何處理非同步資源載入、過場與失敗回復。

### 9.2 卸載與清理策略

場景移除時的清理邊界仍待實驗。至少需區分：

- 應跨場景保留的 Store / Service。
- 只屬於當前場景的實體、計時器、事件訂閱、音效與素材。
- p5.js 實例、畫布與 DOM 掛載點的銷毀時機。
- 重新進入場景時，哪些狀態應復用，哪些應重建。

### 9.3 容器邊界與存取規則

雖然模組可從同一個 `Game Container` 取得能力，但「可取得」不等於「可任意改寫」。尚需確定：

- 是否透過模組提供的方法改變狀態，而非直接改寫物件欄位。
- 如何表達只讀狀態、可觀察事件與有副作用的指令。
- 私有 Game Container 是否確實比 Child / Scoped Container 更適合目前需求。
- Host Contract 最小應包含哪些平台能力，以及哪些能力禁止穿透。
- Game Container 的生命週期應對應單一 Game Runtime、Game Session，或其他範圍。
- `dispose()` 應如何清除 Store、Service、事件訂閱與引擎資源，並避免殘留參照。
- 是否真的需要 Scene 層級作用域；現階段不預設每個 Scene 都建立 Container。

私有 Game Container 原型至少要通過以下驗證，才適合升格為正式決策：

- Game Destroy 後再次進入遊戲，取得的是全新的 Game Container 與 Game Runtime 實例。
- 前一次執行的 Store、Service、事件訂閱、計時器與引擎資源均未殘留。
- Game Container 的建立、重置與銷毀不會改變 World Container 既有實例與生命週期。
- Game 只能經由明確的 Host Contract 使用平台能力，不會隱性回透 World Container。
- 同一套 Game Runtime 能在最小 Host Contract 下獨立測試，不必啟動完整 Web App。

### 9.4 Game Registry、Factory 與多引擎邊界

物件註冊與建立流程仍有下列問題需要比較：

- Entity Definition 的最小共同格式為何，哪些欄位必須保留在特定引擎 Adapter。
- Game Registry 應只是定義索引，或同時負責版本、來源、覆寫與相容性驗證。
- Entity Factory 應回傳純邏輯實例、建立描述，或包含引擎物件參照的組合結果。
- 邏輯實例與引擎物件之間是一對一、一對多，或允許只有其中一方存在。
- EntityManager 是否必要，或應直接採用 p5.js、Three.js、Phaser 等技術既有的場景與物件管理能力。
- Game Reset、Scene Dispose 與 Game Destroy 時，Entity Factory、EntityManager 與 Engine Adapter 的清理順序及所有權如何定義。
- 多引擎支援是同一款遊戲可替換引擎，還是 Game Runtime 能承載採用不同引擎的多款遊戲；兩者複雜度不同，不應預先混為同一需求。
- 若同一 Runtime 同時存在多種引擎或渲染器，Factory 與資源所有權是否仍能維持單一明確邊界。
- Game Registry 內部是否需要區分 Entity 與 Capability 的命名空間；這項區分不應引入第二套註冊核心。
- Capability Definition 的最小契約為何，以及 Component 資料、System 資格、行為 Hook、Service 與 Engine 描述如何避免混為一談。
- Factory 組合能力時，如何處理必要依賴、互斥能力、初始化順序、重名與失敗回復。
- 動態 `add()` / `remove()` 是否真的必要，以及如何同步 Systems 索引、保存狀態並釋放引擎資源。
- 哪些更新由共享 Systems 批次執行，哪些應交由引擎；避免替每個 Entity 建立重複 System。
- Object Pool、Batch Update、Spatial Index 或 Data-Oriented Design 應在什麼規模與量測證據下導入。

在這些問題完成原型驗證前，Game Registry、Capability Definition、Entity Factory、EntityManager、Engine Adapter Factory、`game.create()` 與動態能力 API 都只代表候選責任名稱，不是已實現或已定案的公開介面。

## 10. AI 協作邊界與候選目錄

若本構思經過原型驗證並逐步成熟，可將 Game Architecture 整理為一個有自己入口、索引、契約與決策紀錄的協作邊界。下列只是目標結構示意，本文不會據此預先建立實作目錄：

```text
game/
├── index.md                   Game Architecture 唯一導讀入口
├── GAME_CONTEXT.md            遊戲目標、範圍與限制
├── GAME_ARCHITECTURE.md       遊戲內部分層與生命流程
├── HOST_CONTRACT.md           Game 與 ModuCore 的唯一交接契約
├── AI_BOUNDARY.md             AI 可讀、可改與禁止範圍
├── decisions/                 遊戲層決策，不升格為 ModuCore 規則
├── game.js                    統一入口與 Game Lifecycle Facade
├── container/                 私有 Game Container 的建立、存取與銷毀協調
├── registry/                  Entity 與 Capability Definition 的註冊與查找
├── factories/                 依定義解析、組合能力並建立實例
├── stores/                    跨畫格或跨場景存在的長期遊戲狀態
├── services/                  可由多個模組使用的共用能力
├── systems/                   交通、NPC AI、戰鬥、任務觸發等規則與行為
├── scenes/                    西門町、台北車站、室內商店等場景內容組織
└── engines/                   p5.js、Three.js、Phaser 等引擎適配邊界
```

這份目錄草案表達的是責任邊界，不代表每個目錄都必須存在，也不預先決定檔案粒度。其中 `engines/` 應保存 Adapter、引擎選擇與資源交接，不應重新實作第三方引擎本身；`container/` 也只屬於 Game Runtime，不修改 ModuCore 原有 Container。

為避免 `game.js` 隨功能增加而膨脹，候選依賴關係應保持為：

```text
game.js（協調與委派）
├── container / registry / factories
├── stores / services
├── scenes ── 組合與啟用 ──▶ systems
└── engines ── 適配 ──▶ 第三方遊戲引擎
```

`game.js` 只提供統一入口並協調這些能力，不直接收納它們的內部實作。`registry/` 代表同一個 Game Registry 責任邊界，不要求再拆出獨立的 CapabilityPool 核心。

未來 AI 在這個邊界內協作時，可預設遵守下列規則：

1. 工作範圍預設限於 Game Architecture Boundary。
2. 只使用 `HOST_CONTRACT.md` 允許的 ModuCore 公開能力。
3. 不直接修改 World、Core、Container 內部實作或其他 Project。
4. 平台能力不足時，先建立 Game 層的需求記錄或提案，由人類決定是否開啟 ModuCore 變更任務。
5. Game 內部的重構不得擴大 Host Contract，也不得將遊戲特例注入平台層。
6. 需要變更 ModuCore 時，必須視為另一個具有獨立範圍、理由與驗證的任務，不能當作遊戲實作的附帶修改。

最終希望形成的不是「AI 看完整個 ModuCore 後才能寫遊戲」，而是：

> AI 從 Game Architecture 入口進入，依據明確 Host Contract 使用 ModuCore，並將所有遊戲複雜度保留在 Game 邊界內。

## 11. 最小原型與驗證順序

可以先製作一個最小原型，只包含：

- 一個由 Runtime Factory 建立、並可完整 dispose 的私有 Game Container。
- 一個由 Game Module 宣告、在 Game Registry 中可查找但不會立即實例化的 Entity Definition。
- 三個最小 Capability Definitions，例如 position、movement 與 render；註冊時不立即建立 Entity 或載入全部資源。
- 一個依 Entity Definition 查找並組合能力的最小 Entity Factory。
- 一個共享 System 處理多個具有相同能力條件的 Entities，用來確認不會為每個 Entity 建立重複 System。
- 兩個最小 Engine Adapter 或一個 Engine Adapter 加測試替身，用來比較引擎差異是否確實被隔離。
- 兩個可切換場景。
- 一個跨場景保留的 Player Store。
- 一個僅屬於場景的計時器或事件訂閱。
- 一個由 Page 掛載的 p5.js 畫布。
- 一個「玩家死亡後重來」流程，用來驗證 Persistent、Game Session 與 Scene 三種 Reset Scope。

原型的驗證重點不是遊戲內容，而是觀察：Game Runtime 重建時是否取得全新的 Game Container、World Container 是否保持不變、Host Contract 是否能阻止隱性依賴、能力與物件定義註冊是否和實例建立分離、Factory 是否能從同一 Registry 組合能力、共享 System 是否能處理多個 Entities、引擎差異是否停留在 Adapter 邊界、是否真的需要 EntityManager、場景切換後玩家狀態是否保留、舊場景資源是否完整清理、玩家死亡重來時是否只重置應清除的層級，以及 UI 元件重新掛載時是否會意外重建遊戲實例。Object Pool 與動態能力增減不必列入第一個原型，除非量測或玩法需求已證明必要。
