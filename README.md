# CoDesigner - 协同设计平台

基于 **React** 的融合 Canvas 可视化原型设计、智能文档管理与接口协同的协同设计平台。参考 Figma、MasterGo、Pixso 等主流设计协作工具，实现画布拖拽式原型绘制与多人实时协同编辑，为产品、设计、开发与测试提供统一协作环境。

## 技术栈

- **前端**: React 18 + Vite
- **画布与渲染**: [tldraw](https://tldraw.dev)（专业设计工具框架）
- **拖拽与交互**: [@dnd-kit](https://dndkit.com)（列表/面板拖拽）
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **路由**: React Router v7
- **协同通信**: Socket.io-client（预留，后续对接后端 WebSocket）

## 项目结构

```
src/
├── components/
│   ├── AppSidebar/      # 应用主导航
│   ├── Toolbar/         # 画布工具栏（工具、撤销/重做、网格）
│   ├── Sidebar/         # 属性面板
│   ├── Canvas/          # 画布（tldraw）
│   ├── Layers/          # 图层管理
│   └── DesignWorkspace/ # 设计页整体布局
├── hooks/               # 自定义 Hooks（项目、画布历史等）
├── stores/              # Zustand 状态（项目、画布、文档、接口）
├── layouts/             # 主布局
├── pages/               # 页面（首页、画布设计、智能文档、接口协同）
└── utils/               # 工具与常量
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 功能模块

- **画布设计**: 基于 tldraw 的绘制、形状、文本、箭头等，支持工具栏、图层面板与属性面板（缩放、网格等）。
- **智能文档**: PRD 与设计说明（页面占位，后续接文档编辑与接口关联）。
- **接口协同**: 接口定义与管理（页面占位，后续接接口列表与 AI 注释）。

## 后续规划

- 画布数据与 tldraw 状态同步，实现撤销/重做与持久化
- 接入 Yjs 或自研 WebSocket 实现多人实时协同
- 文档—原型—接口的联动与 AI 辅助生成
- 新人引导与多主题模板

## 参考

- [tldraw 文档](https://tldraw.dev)
- [Zustand](https://github.com/pmndrs/zustand)
- [@dnd-kit](https://dndkit.com)
