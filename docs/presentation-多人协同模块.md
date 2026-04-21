# 多人协同模块 — PPT 内容要点与讲解稿

本文档结合 CoDesigner 仓库中的**实际实现**，对应你幻灯片左侧四个技术点，说明右侧版面建议、每张要点写什么，以及口头讲解时可用的稿子。

---

## 一、右侧大图区建议放什么

幻灯片右侧虚线框适合放**一张总览图**，任选其一或组合：

1. **架构简图（推荐）**  
   - 浏览器：`CanvasStage` → `useSync`（`@tldraw/sync`）→ WebSocket（`wss://…/api/v1/sync/projects/{projectKey}?accessToken=…`）  
   - 服务端：`ProjectSyncService` HTTP Upgrade → 校验 JWT → `getRealtimeProjectAccess`（项目成员）→ `TLSocketRoom`（`@tldraw/sync-core`）→ 内存房间 → 防抖落库 `project_canvases`  

2. **时序图（连接与同步）**  
   - 客户端发起 WebSocket，URL 中带 `accessToken`  
   - 服务端验证 token、确认项目访问权、把连接挂到对应项目的 `TLSocketRoom`  
   - 之后画布操作经 tldraw 同步协议在房间内广播；无人连接后延迟清理房间并持久化快照  

3. **若时间紧**：右侧可放 **关键路径截图**（工具栏协同状态 + 多用户光标），并在角落用小字标注对应文件名（见下文「代码锚点」）。

---

## 二、左侧四点与项目代码的对应关系（PPT  bullet 可照抄精简版）

### 1. WebSocket 实时通信

**实现要点（写进 PPT）**

- 全双工通道：原生 `ws` + HTTP `Upgrade`，路径前缀 `/api/v1/sync/projects/`。  
- 鉴权：查询参数携带 `accessToken`，服务端用 JWT 解析用户身份。  
- 业务房间：每个项目一个 `TLSocketRoom`，与 tldraw 官方同步协议对齐。  

**代码锚点**

- 前端：`src/components/Canvas/CanvasStage.jsx` 中 `CollaborativeCanvasStage` 使用 `useSync`，`resolveWebSocketUrl('/sync/projects/…', { accessToken })`。  
- 后端：`backend/src/projects/project-sync.service.ts` 中 `handleUpgrade`、`WebSocketServer`、`TLSocketRoom`。

---

### 2. 乐观锁与冲突处理

**实现要点（写进 PPT）**

- **REST 保存画布**（非实时通道、例如导入/全量保存）：`PUT` 请求体带 `baseRevision`，数据库仅在 `revision === baseRevision` 时更新；否则返回 `409`，业务码 `CANVAS_REVISION_CONFLICT`，并带上服务端最新 `revision`。这是典型的**乐观锁**。  
- **实时协同编辑**：同一房间内由 `TLSocketRoom` 合并并发操作，避免「多人同时改」在协议层直接覆盖；服务端房间数据**防抖写入**数据库，`revision` 递增，保证持久化有序。  

**代码锚点**

- 乐观锁冲突：`backend/src/projects/projects.service.ts` 中 `putProjectCanvas`（`updateMany` + `baseRevision`）、`throwRevisionConflict`。  
- 实时合并与落库：`project-sync.service.ts` 中 `persistRoom`、`schedulePersist`（防抖 `PERSIST_DEBOUNCE_MS`）。

**讲解时注意**：幻灯片上的「乐观锁」在工程里**主要体现为 HTTP 接口的版本号**；在线编辑的冲突消解更多依赖 **tldraw sync 的 room 协议**，两者互补，可在答辩时一句话说清。

---

### 3. 多用户光标与身份

**实现要点（写进 PPT）**

- 当前登录用户映射为协同用户信息：`id`、`name`、稳定 `color`（按 userId 哈希选色），供 tldraw 绘制协作者光标与名牌。  
- 连接成功后，从编辑器读取 `getCollaborators()`，与本地用户合并为在线列表，供工具栏展示。  

**代码锚点**

- `CanvasStage.jsx`：`buildSyncUserPreferences`、`buildRemoteCollaborationState` 中 `editor.getCollaborators()`。  
- `Toolbar.jsx`：订阅 `subscribeCollaboration`，展示协同状态与在线用户。

---

### 4. 协同编辑状态管理

**实现要点（写进 PPT）**

- **模式分流**：已登录且带 `projectId` + `accessToken` 时走远程协同 `CollaborativeCanvasStage`；否则走本地快照模式 `SnapshotCanvasStage`。  
- **连接状态**：`synced` / `reconnecting` / `offline` 等映射到工具栏文案与样式。  
- **在线用户列表**：通过 `canvasApi.subscribeCollaboration` 推给工具栏，与 Zustand 中画布工具状态并存、职责分离。  
- **权限**：进入同步房间前，服务端 `getRealtimeProjectAccess` 校验用户是否为项目所有者或成员（`owner` / `editor` 角色）。  

**代码锚点**

- `CanvasStage.jsx`：`CanvasStage` 根据 `authMode` / `accessToken` 分支；`collaborationStateRef` 与 `notifyCollaborationListeners`。  
- `Toolbar.jsx`：`collaboration`、`onlineUsers`、状态徽标。  
- `projects.service.ts`：`getRealtimeProjectAccess`、`buildProjectAccessWhere`。

**说明**：幻灯片模板里的「文档组件级锁定」若指**细粒度形状/组件加锁**，当前仓库**未单独实现**该能力；协同冲突由 tldraw 房间协议处理，权限在项目成员维度。答辩时建议如实表述，或将其列为后续扩展。

---

## 三、讲解稿（约 4～6 分钟口播，可按时间删减）

**【开场 — 半分钟】**  
这一页讲的是 CoDesigner 里**多人协同画布**的实现思路。我们采用 **tldraw 官方同步栈**：前端 `useSync` 对接后端基于 `TLSocketRoom` 的房间服务，在**项目维度**建立实时会话；持久化落在 PostgreSQL 的 `project_canvases` 表，并带**版本号 revision** 支持非实时保存时的乐观锁。

**【第一点 — WebSocket】**  
连接不是普通轮询，而是浏览器与服务端之间的 **WebSocket 全双工**链路。前端把协同用的 WebSocket 地址拼成带 `accessToken` 的 URL；服务端在 HTTP Upgrade 阶段校验 JWT，并调用项目访问接口，只有**有权限的用户**才能进入对应项目的同步房间。进入后，所有画布增量都走 tldraw 定义的同步协议，延迟低、适合多人同时操作。

**【第二点 — 乐观锁与一致性】**  
这里分两层说。第一层，如果走 **REST 全量保存**，客户端带上**本地已知的 revision**，服务端用数据库条件更新：只有版本匹配才写入，否则返回冲突码，让客户端拉最新再合并——这是标准的乐观锁，避免离线或多端覆盖。第二层，**在线协同**时，多人编辑由 **`TLSocketRoom` 在服务端统一合并**，我们再用防抖把房间快照写入数据库并递增 revision，减少写库频率，同时保证落盘数据与房间状态一致。

**【第三点 — 光标与身份】**  
每个会话绑定当前用户的 id、显示名和颜色，交给 tldraw 渲染**协作者光标和标识**。我们从编辑器 API 读取在线协作者列表，和本地用户一起在工具栏展示，让使用者清楚「谁在和我一起画」。

**【第四点 — 状态与权限】**  
前端根据是否登录、是否有项目上下文，自动切换**本地画布**和**远程协同画布**。协同模式下，我们维护连接状态、在线用户列表，并通过回调通知工具栏刷新。权限上，同步入口与 REST 一样，都基于**项目成员关系**，不是任意用户都能连同一个房间。

**【收尾 — 可选】**  
右侧如果配架构图，可以指着从浏览器 `useSync` 到 Nest 里 `ProjectSyncRoom` 再到数据库的路径总结一句：**实时层用 WebSocket + 房间协议，持久层用 revision 做版本控制**，这样幻灯片四个要点和代码实现就能一一对应。

---

## 四、答辩时可能被问到的简短回答

| 问题 | 可答要点 |
|------|----------|
| 为什么用 tldraw sync 而不是自研 OT？ | 复用成熟协议与实现，降低冲突合并与光标同步的开发成本，与 `Tldraw` 编辑器同源。 |
| 冲突时用户看到什么？ | 在线：由 room 自动合并；HTTP 保存冲突：收到 `CANVAS_REVISION_CONFLICT`，需按产品策略拉取或重试。 |
| Socket.io 在仓库里吗？ | 依赖里可能仍有历史/预留，**当前协同路径实现为原生 `ws` + tldraw sync**，以代码为准。 |

---

## 五、关键文件一览（便于你在 PPT 备注里贴路径）

| 主题 | 路径 |
|------|------|
| 前端协同画布与 `useSync` | `src/components/Canvas/CanvasStage.jsx` |
| 工具栏协同状态 | `src/components/Toolbar/Toolbar.jsx` |
| WebSocket 与房间、落库 | `backend/src/projects/project-sync.service.ts` |
| 画布 REST 乐观锁 | `backend/src/projects/projects.service.ts`（`putProjectCanvas`） |
| WS URL 拼接 | `src/utils/apiClient.js`（`resolveWebSocketUrl`） |

---

*文档生成依据：仓库内上述文件当前实现；若你后续增加「形状级锁定」或文档模块协同，可在本页第四点补充并更新架构图。*
