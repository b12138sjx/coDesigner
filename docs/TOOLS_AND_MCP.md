# CoDesigner 推荐工具与 MCP

本文档说明在本项目中推荐使用的 Cursor 能力：**Skills**、**Rules** 以及 **MCP（Model Context Protocol）** 集成，便于开发与协作。

---

## 1. 项目内已配置

### Skills（.cursor/skills/）

| Skill | 用途 |
|-------|------|
| **coDesigner-codebase** | 在修改或扩展 CoDesigner 时提供代码库约定：技术栈（React、Vite、Zustand、tldraw）、目录结构、画布/文档/接口模块说明、新增功能时的落脚点。Agent 在改本仓库代码时会自动参考。 |

### Rules（.cursor/rules/）

| 规则 | 作用 |
|------|------|
| **project-conventions.mdc** | 对 `src/**/*` 生效：组件与样式约定、`@/` 路径、Zustand 使用、新页面/导航添加方式。 |
| **design-and-mcp.mdc** | 全局生效：何时使用 Figma MCP（设计稿转代码）、何时使用 Chrome DevTools MCP（页面操作与测试）。 |

---

## 2. 推荐 MCP 服务器

MCP 在 Cursor 中需在设置里启用并配置（如 Cursor Settings → MCP）。以下与 CoDesigner 场景最相关。

### Figma MCP（设计稿 → 代码）

- **何时用**：按 Figma 设计实现或还原 UI、需要设计稿尺寸/样式/结构时。
- **常用能力**：
  - **get_design_context**：根据 nodeId + fileKey 获取设计上下文（参考代码、截图、资源），再按本项目 React + CSS Modules 适配。
  - **get_screenshot**：仅要设计稿截图时使用。
  - **get_metadata**：查看页面/节点结构。
- **使用方式**：在对话中粘贴 Figma 链接（如 `https://figma.com/design/xxx/...?node-id=1-2`），或说明“按这个 Figma 实现”，Agent 会解析 fileKey 与 nodeId 并调用相应工具。

### Chrome DevTools MCP（浏览器自动化与调试）

- **何时用**：需要验证 CoDesigner 在浏览器中的表现、做简单 E2E、截图、查看控制台/网络时。
- **常用能力**：
  - **list_pages / select_page**：选择要操作的标签页。
  - **take_snapshot**：获取页面 a11y 树，便于定位元素。
  - **take_screenshot**：截图。
  - **click / fill / navigate_page**：模拟点击、填表、跳转。
  - **list_console_messages / list_network_requests**：查报错与请求。
- **使用方式**：用 Chrome 打开 CoDesigner（如 `npm run dev` 后的地址），在 Cursor 中说“在浏览器里点一下登录”“截一张设计页的图”“看下控制台有没有报错”等，Agent 会通过 DevTools MCP 操作或检查。

### 其他可选 MCP（按需启用）

- **Git**：仓库操作、diff、提交建议（若已安装 Git MCP）。
- **Database**：若后续接后端数据库，可配数据库 MCP 做查询与结构查看。
- **Filesystem / Fetch**：一般 Cursor 已具备文件与网络能力，仅在有专门 MCP 封装时再考虑。

---

## 3. 在 Cursor 中启用 MCP

1. 打开 **Cursor Settings**（或 `Cmd/Ctrl + ,`）。
2. 搜索 **MCP** 或进入 **Features → MCP**。
3. 在 **MCP Servers** 中确认 **Figma**、**Chrome DevTools** 等已启用（Cursor 内置的会出现在列表中）。
4. 若使用自定义 MCP 服务器，按官方文档在配置文件中添加对应 server 块。

启用后，在对话中提及“Figma”“设计稿”“浏览器里测试”等，Agent 会结合 `.cursor/rules/design-and-mcp.mdc` 自动选用对应 MCP。

---

## 4. 与 CoDesigner 工作流的对应关系

| 你要做的事 | 建议使用的 Skill / Rule / MCP |
|------------|-------------------------------|
| 改画布、文档、接口或加新页面 | 依赖 **coDesigner-codebase** + **project-conventions** |
| 按 Figma 做页面或组件 | **design-and-mcp** + **Figma MCP**（get_design_context） |
| 在浏览器里验证、截图、简单自动化 | **design-and-mcp** + **Chrome DevTools MCP** |
| 统一代码风格与目录约定 | **project-conventions**（对 `src/**/*` 生效） |

如需扩展更多 MCP 或团队规范，可在本文档和 `.cursor/rules/` 中继续补充。
