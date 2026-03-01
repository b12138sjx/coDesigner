# CoDesigner

> 融合 Canvas 原型设计、智能文档与接口协同的协同设计平台

## 📋 项目概述

CoDesigner 旨在成为一站式产品设计协同平台，通过整合 **Canvas 可视化原型**、**智能文档** 与 **接口管理** 三大能力，解决传统产品研发中信息割裂、协作低效的问题，为中小团队提供轻量、全流程覆盖的产品设计工具。

**当前阶段**：前端单体应用已搭好骨架，画布设计模块基于 tldraw 实现可用的白板与工具栏；文档与接口模块为占位页，后续将迭代实现。

---

## 🎯 核心价值（产品愿景）

- **全流程一体化**：需求文档 → 可视化原型 → 接口定义，一平台完成
- **双向实时联动**：文档、原型、接口动态同步，一处修改多处更新
- **AI 深度赋能**：（规划中）需求解析、接口生成、文本润色
- **轻量化易上手**：标准化模板与素材库，降低学习成本

---

## 📁 项目结构

```
coDesigner/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── AppSidebar/       # 应用侧边导航
│   │   ├── Canvas/           # 画布（tldraw 封装）
│   │   ├── DesignWorkspace/  # 设计页整体布局
│   │   ├── Layers/           # 图层面板
│   │   ├── Sidebar/          # 属性面板
│   │   └── Toolbar/          # 画布工具栏
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useCanvasHistory.js
│   │   └── useProject.js
│   ├── layouts/
│   │   └── MainLayout.jsx    # 主布局（侧栏 + 内容区）
│   ├── pages/                # 页面
│   │   ├── HomePage.jsx      # 首页
│   │   ├── DesignPage.jsx    # 画布设计
│   │   ├── DocumentsPage.jsx # 智能文档（占位）
│   │   └── ApiPage.jsx       # 接口协同（占位）
│   ├── stores/               # Zustand 状态
│   │   ├── canvasStore.js    # 画布：工具、缩放、网格、撤销/重做栈
│   │   ├── projectStore.js   # 项目列表与当前项目
│   │   ├── documentStore.js  # 文档（按项目）
│   │   └── apiStore.js       # 接口（按项目）
│   ├── utils/
│   │   └── constants.js      # 路由、工具等常量
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── docs/
│   ├── README.md              # 本说明
│   └── TOOLS_AND_MCP.md       # 推荐 Skills / Rules / MCP 与使用方式
├── package.json
└── vite.config.js
```

---

## ✅ 已实现功能

### 画布设计模块

- **画布**：基于 [tldraw](https://tldraw.dev) 的白板，支持绘制、形状、文本、箭头等；按 `projectId` 预留加载/持久化扩展点。
- **工具栏**：选择、绘制、矩形、椭圆、文本、箭头；撤销/重做按钮；网格显示开关。（注：工具与 tldraw 内部工具尚未完全联动，历史栈在 store 中，与 tldraw 的同步待接）
- **属性面板**：当前工具、画布缩放滑块；选中元素后的属性编辑为占位说明。
- **图层面板**：静态示例图层列表，文案提示“画布中的形状将同步到此列表”，与 tldraw 的实时同步待做。
- **路由**：`/design`、`/design/:projectId`，设计页使用 `DesignWorkspace` 布局。

### 全局与导航

- **首页**：产品介绍与入口卡片（画布设计、智能文档、接口协同）。
- **侧边栏**：首页、画布设计、智能文档、接口协同导航。
- **状态**：Zustand 管理项目、画布、文档、接口；`useProject`、`useCanvasHistory` 等 hooks 已就绪，便于后续接持久化与协同。

### 文档与接口模块

- **页面**：`/documents`、`/documents/:projectId` 与 `/api`、`/api/:projectId` 已存在，目前为占位文案与布局，文档编辑与接口列表未实现。

---

## 🚧 规划中 / 待实现

- 画布：工具栏与 tldraw 工具/历史完全打通；图层面板与 tldraw 形状树同步；按项目加载/保存画布数据。
- 文档：PRD 编辑器（如 Markdown）、与画布/接口的双向联动。
- 接口：接口定义 CRUD、与文档/原型的联动、多格式导出。
- 协同：多用户实时编辑（如基于 Socket.IO + OT/CRDT）。
- 后端与 AI：用户与权限、持久化存储、AI 解析与润色等（技术选型未定，可能为独立后端服务）。

---

## 🏗️ 技术栈（当前）

| 类别     | 技术 |
|----------|------|
| 框架     | React 18 + Vite |
| 路由     | React Router v7 |
| 状态     | Zustand |
| 画布     | @tldraw/tldraw |
| 拖拽     | @dnd-kit（已依赖，可复用） |
| 实时通信 | socket.io-client（已依赖，待接后端） |
| 样式     | CSS Modules |

构建与别名：Vite 默认配置，`@` 指向 `src/`。

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18（推荐 20+）

### 安装与运行

```bash
# 克隆项目
git clone <repository-url>
cd coDesigner

# 安装依赖
npm install

# 开发
npm run dev
```

浏览器访问 Vite 提供的本地地址（通常 `http://localhost:5173`）。

### 构建与预览

```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview
```

---

## 📜 可用脚本

| 命令           | 说明         |
|----------------|--------------|
| `npm run dev`  | 启动开发服务器 |
| `npm run build`| 生产构建     |
| `npm run preview` | 本地预览构建产物 |

---

## 🛠 开发与工具

- **Skills / Rules / MCP**：项目内配置了 Cursor 用到的 Skill（代码库约定）与 Rules（项目约定、设计稿与浏览器测试）。推荐启用的 MCP：Figma（设计稿转代码）、Chrome DevTools（浏览器自动化与调试）。详见 [docs/TOOLS_AND_MCP.md](TOOLS_AND_MCP.md)。

---

## 🤝 贡献与协作

1. Fork 本仓库。
2. 从 `main` 拉取最新，创建功能分支：`git checkout -b feature/xxx`。
3. 提交变更：`git commit -m 'feat: 简短描述'`。
4. 推送分支：`git push origin feature/xxx`。
5. 提交 Pull Request，描述改动与对应模块。

---

## 📄 许可证

本项目采用 MIT 许可证，详见仓库根目录 [LICENSE](../LICENSE)（如有）。
