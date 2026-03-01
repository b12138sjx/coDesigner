export const SAMPLE_PROJECT_ID = 'sample_project'

/** 进入画布设计且无已保存快照时，会注入 Mock 演示内容的项目 ID（如默认项目、样例项目） */
export const DEMO_CANVAS_PROJECT_IDS = ['default', 'sample_project']

export const SAMPLE_PROJECT = {
  id: SAMPLE_PROJECT_ID,
  name: '样例项目 · 协同设计演示',
  brief: '演示画布设计、智能文档、接口协同三个模块的一体化使用。',
  updatedAt: Date.now() - 1000 * 60 * 60 * 4,
}

export const SAMPLE_DOCUMENT = {
  content: `# CoDesigner 样例项目

## 项目目标
- 打通「低保真原型 -> 智能文档 -> 接口协同」的一体化流程
- 让产品、设计、开发在同一个项目空间协作

## 本周计划
1. 设计页完成首页低保真稿
2. 文档页补齐需求说明与交互状态
3. 接口页确认登录与项目列表接口

## 关键验收点
- 项目可从平台首页进入
- 画布支持组件插入和手绘
- 文档评论可被记录与追踪
`,
  comments: [
    {
      id: 'c_sample_1',
      text: '这里可以再补一段登录失败场景说明。',
      quote: '接口页确认登录与项目列表接口',
      lineStart: null,
      createdAt: Date.now() - 1000 * 60 * 20,
      resolved: false,
    },
  ],
}

export const SAMPLE_APIS = [
  {
    id: 'api_login',
    name: '用户登录',
    method: 'POST',
    path: '/api/v1/auth/login',
    status: '已联调',
    owner: '后端 A',
    description: '账号密码登录，返回 token 与用户信息',
    frontendNeed: '需要区分账号不存在与密码错误，并支持 429 频控提示。',
    backendPlan: '统一返回 errorCode，前端按字典映射文案；登录成功返回 accessToken + refreshToken。',
    requestExample: '{ "account": "demo@co.com", "password": "******" }',
    responseExample:
      '{ "code": 0, "data": { "accessToken": "...", "user": { "id": "u_1", "name": "张三" } } }',
    acceptance: '错误码覆盖 1001/1002/1003，联调环境响应时间 < 300ms。',
    notes: [
      {
        id: 'n_login_1',
        author: '产品',
        role: '产品',
        text: '失败场景要返回可读错误码，前端弹窗文案按 errorCode 映射。',
        createdAt: Date.now() - 1000 * 60 * 42,
      },
      {
        id: 'n_login_2',
        author: '后端 A',
        role: '后端',
        text: 'refreshToken 先放响应头，后续再评估放 body。',
        createdAt: Date.now() - 1000 * 60 * 18,
      },
    ],
  },
  {
    id: 'api_projects',
    name: '项目列表',
    method: 'GET',
    path: '/api/v1/projects',
    status: '开发中',
    owner: '后端 B',
    description: '获取当前用户可访问项目',
    frontendNeed: '首页需要分页 + 搜索，默认按最近编辑排序。',
    backendPlan: '提供 page/pageSize/keyword 参数，返回 total 与 list。',
    requestExample: '/api/v1/projects?page=1&pageSize=20&keyword=',
    responseExample:
      '{ "code": 0, "data": { "total": 36, "list": [{ "id": "p_1", "name": "官网改版", "updatedAt": 1719980000000 }] } }',
    acceptance: '支持 updatedAt 倒序，字段包含 id/name/updatedAt/owner。',
    notes: [
      {
        id: 'n_proj_1',
        author: '前端',
        role: '前端',
        text: '希望支持按 updatedAt 倒序，减少前端二次排序逻辑。',
        createdAt: Date.now() - 1000 * 60 * 60,
      },
    ],
  },
  {
    id: 'api_project_detail',
    name: '项目详情',
    method: 'GET',
    path: '/api/v1/projects/:id',
    status: '待确认',
    owner: '产品/后端',
    description: '返回项目元信息与协作配置',
    frontendNeed: '项目概览页要展示成员、权限和最后编辑时间。',
    backendPlan: '详情接口补充 collaborators、permissions 字段。',
    requestExample: '/api/v1/projects/:id',
    responseExample:
      '{ "code": 0, "data": { "id": "p_1", "name": "官网改版", "collaborators": 8, "permissions": ["design:view"] } }',
    acceptance: '字段命名与项目列表保持一致，支持权限枚举。',
    notes: [],
  },
]
