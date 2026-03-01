---
name: coDesigner-codebase
description: CoDesigner 项目代码库约定与结构说明。在修改或扩展 CoDesigner（画布设计、智能文档、接口协同）时使用；涵盖 React + Vite、Zustand、tldraw、路由与目录约定。
---

# CoDesigner 代码库

## 技术栈

- **框架**: React 18 + Vite，路径别名 `@` → `src/`
- **路由**: React Router v7，`/`、`/design/:projectId?`、`/documents/:projectId?`、`/api/:projectId?`
- **状态**: Zustand（`stores/`），无 Redux
- **画布**: @tldraw/tldraw，在 `CanvasStage.jsx` 中封装
- **样式**: CSS Modules（`*.module.css`），与组件同目录
- **拖拽**: @dnd-kit 已安装，可用于列表/面板排序
- **实时**: socket.io-client 已依赖，后端未接

## 目录与命名

- **组件**: `src/components/<Feature>/`，主文件与目录同名的 `.jsx`（如 `Toolbar.jsx` + `Toolbar.module.css`）
- **页面**: `src/pages/*Page.jsx`，由路由渲染，内部用 `layouts/MainLayout`
- **状态**: `src/stores/*.js`，Zustand `create()`，命名 `useXxxStore`
- **常量**: `src/utils/constants.js`（`ROUTES`、`TOOLS`、`APP_NAME` 等）
- **Hooks**: `src/hooks/use*.js`，可组合 stores 与路由

## 画布相关

- 画布状态在 `canvasStore`：`tool`、`zoom`、`showGrid`、`showRulers`、`historyStack`/`historyIndex`
- 工具栏（`Toolbar.jsx`）的 tool 与 tldraw 内部工具尚未完全联动；历史撤销/重做栈在 store，与 tldraw 的同步待实现
- 扩展画布时：在 `CanvasStage.jsx` 的 `onMount` 中按 `projectId` 加载/持久化，或注册协同
- 图层面板（`LayersPanel`）当前为 Mock 数据，与 tldraw 形状树同步待做

## 新增功能时

- 新页面：在 `App.jsx` 加 `Route`，在 `AppSidebar` 加导航项，必要时在 `constants.js` 加 `ROUTES`
- 新 store：在 `stores/` 新增 `*Store.js`，按项目维度的数据可参考 `documentStore`/`apiStore`（以 `projectId` 为 key）
- 新组件：放在对应 `components/<Feature>/`，使用 CSS Module，通过 `@/` 引用

## 参考

- 项目概览与快速开始见 [docs/README.md](../../docs/README.md)
- 推荐 MCP 与工具见 [docs/TOOLS_AND_MCP.md](../../docs/TOOLS_AND_MCP.md)
