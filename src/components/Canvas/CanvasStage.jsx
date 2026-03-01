import { useCallback, useEffect, useRef } from 'react'
import { Tldraw, GeoShapeGeoStyle, createShapeId } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCanvasStore } from '@/stores/canvasStore'
import { SAMPLE_PROJECT_ID } from '@/utils/mockData'
import styles from './CanvasStage.module.css'

const TOOL_MAP = {
  select: 'select',
  draw: 'draw',
  frame: 'frame',
  rect: 'rectangle',
  ellipse: 'ellipse',
  text: 'text',
  arrow: 'arrow',
}

function clampZoom(value) {
  return Math.min(2, Math.max(0.25, value))
}

function getViewportCenterPagePoint(editor) {
  const viewport = editor.getViewportScreenBounds()
  const centerScreenPoint = {
    x: viewport.x + viewport.w / 2,
    y: viewport.y + viewport.h / 2,
  }
  return editor.screenToPage(centerScreenPoint)
}

function buildTemplateShapes(templateId, center) {
  switch (templateId) {
    case 'page_frame': {
      const frameId = createShapeId()
      return [
        {
          id: frameId,
          type: 'frame',
          x: center.x - 480,
          y: center.y - 320,
          props: { w: 960, h: 640, name: '页面框架' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          parentId: frameId,
          x: 0,
          y: 0,
          props: { geo: 'rectangle', w: 960, h: 64, text: '导航栏' },
        },
        {
          id: createShapeId(),
          type: 'text',
          parentId: frameId,
          x: 32,
          y: 96,
          props: { text: '页面标题' },
        },
        {
          id: createShapeId(),
          type: 'text',
          parentId: frameId,
          x: 32,
          y: 134,
          props: { text: '副标题 / 页面说明' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          parentId: frameId,
          x: 32,
          y: 190,
          props: { geo: 'rectangle', w: 896, h: 400, text: '主体内容区' },
        },
      ]
    }
    case 'title_block':
      return [
        {
          id: createShapeId(),
          type: 'text',
          x: center.x - 220,
          y: center.y - 66,
          props: { text: '一级标题' },
        },
        {
          id: createShapeId(),
          type: 'text',
          x: center.x - 220,
          y: center.y - 26,
          props: { text: '二级说明文字，描述模块价值与场景。' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 220,
          y: center.y + 26,
          props: { geo: 'rectangle', w: 520, h: 86, text: '内容说明区块' },
        },
      ]
    case 'nav_bar':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 380,
          y: center.y - 44,
          props: { geo: 'rectangle', w: 760, h: 88, text: '导航容器' },
        },
        { id: createShapeId(), type: 'text', x: center.x - 340, y: center.y - 8, props: { text: 'Logo' } },
        { id: createShapeId(), type: 'text', x: center.x - 120, y: center.y - 8, props: { text: '首页' } },
        { id: createShapeId(), type: 'text', x: center.x - 20, y: center.y - 8, props: { text: '功能' } },
        { id: createShapeId(), type: 'text', x: center.x + 80, y: center.y - 8, props: { text: '文档' } },
        { id: createShapeId(), type: 'text', x: center.x + 300, y: center.y - 8, props: { text: '登录' } },
      ]
    case 'button_group':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 210,
          y: center.y - 24,
          props: { geo: 'rectangle', w: 120, h: 48, text: '主按钮' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 70,
          y: center.y - 24,
          props: { geo: 'rectangle', w: 120, h: 48, text: '次按钮' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x + 70,
          y: center.y - 24,
          props: { geo: 'rectangle', w: 120, h: 48, text: '幽灵按钮' },
        },
      ]
    case 'form_block':
      return [
        { id: createShapeId(), type: 'text', x: center.x - 220, y: center.y - 96, props: { text: '登录表单' } },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 220,
          y: center.y - 50,
          props: { geo: 'rectangle', w: 440, h: 54, text: '账号输入框' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 220,
          y: center.y + 20,
          props: { geo: 'rectangle', w: 440, h: 54, text: '密码输入框' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 220,
          y: center.y + 92,
          props: { geo: 'rectangle', w: 440, h: 52, text: '提交按钮' },
        },
      ]
    case 'card_list':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 340,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 200, h: 220, text: '卡片 A' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 100,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 200, h: 220, text: '卡片 B' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x + 140,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 200, h: 220, text: '卡片 C' },
        },
      ]
    default:
      return []
  }
}

function buildSampleShowcaseShapes(center) {
  const entryFrameId = createShapeId()
  const workspaceFrameId = createShapeId()

  return [
    {
      id: entryFrameId,
      type: 'frame',
      x: center.x - 1260,
      y: center.y - 420,
      props: { w: 900, h: 760, name: '平台入口流转示例' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: entryFrameId,
      x: 20,
      y: 20,
      props: { geo: 'rectangle', w: 860, h: 64, text: 'CoDesigner - 登录 / 注册 / 游客进入' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: entryFrameId,
      x: 20,
      y: 108,
      props: { geo: 'rectangle', w: 410, h: 230, text: '登录卡片\n账号输入\n密码输入\n登录按钮' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: entryFrameId,
      x: 450,
      y: 108,
      props: { geo: 'rectangle', w: 430, h: 230, text: '注册卡片\n昵称\n邮箱\n密码\n注册按钮' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: entryFrameId,
      x: 20,
      y: 358,
      props: { geo: 'rectangle', w: 860, h: 86, text: '游客模式入口（跳过登录）' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: entryFrameId,
      x: 20,
      y: 464,
      props: { geo: 'rectangle', w: 860, h: 266, text: '项目首页\n- 项目列表\n- 新建项目（创建后仍停留在首页）\n- 点击项目后再进入模块' },
    },
    {
      id: workspaceFrameId,
      type: 'frame',
      x: center.x - 240,
      y: center.y - 420,
      props: { w: 1520, h: 900, name: '项目工作区示例（低保真）' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 0,
      y: 0,
      props: { geo: 'rectangle', w: 1520, h: 72, text: '顶部栏：项目名 / 夜间日间切换 / 当前用户' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 0,
      y: 72,
      props: { geo: 'rectangle', w: 260, h: 828, text: '左侧导航\n项目首页\n当前项目\n- 画布设计\n- 智能文档\n- 接口协同' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 280,
      y: 92,
      props: { geo: 'rectangle', w: 940, h: 108, text: '画布工具条（选择/手绘/矩形/椭圆/文本/组合/解组）' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 280,
      y: 218,
      props: { geo: 'rectangle', w: 260, h: 660, text: '左侧组件库（可折叠）\n搜索\n页面框架\n标题区\n导航栏\n按钮组\n表单块' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 560,
      y: 218,
      props: { geo: 'rectangle', w: 520, h: 660, text: '白板画布\n拖拽插入低保真组件\n支持多选缩放与组合' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 1100,
      y: 218,
      props: { geo: 'rectangle', w: 180, h: 660, text: '右侧属性面板（可折叠）\n工具\n缩放\n提示' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 1300,
      y: 218,
      props: { geo: 'rectangle', w: 200, h: 320, text: '智能文档\nMarkdown 编辑\n注释面板可折叠' },
    },
    {
      id: createShapeId(),
      type: 'geo',
      parentId: workspaceFrameId,
      x: 1300,
      y: 558,
      props: { geo: 'rectangle', w: 200, h: 320, text: '接口协同\n前后端诉求\n参数示例\n沟通记录' },
    },
    {
      id: createShapeId(),
      type: 'text',
      x: center.x - 300,
      y: center.y - 70,
      props: { text: '→ 选择项目后进入项目工作区，再按模块协同' },
    },
  ]
}

function getPagePointFromEvent(editor, event) {
  return editor.screenToPage({
    x: event.clientX,
    y: event.clientY,
  })
}

function seedSampleCanvas(editor) {
  const center = getViewportCenterPagePoint(editor)
  const pageShapes = buildSampleShowcaseShapes(center)
  editor.createShapes(pageShapes)
}

/**
 * 基于 tldraw 的画布：支持绘制、形状、文本、箭头等，为后续多人协同与持久化预留接口
 */
export function CanvasStage({ projectId, onReady }) {
  const editorRef = useRef(null)
  const tool = useCanvasStore((state) => state.tool)
  const zoom = useCanvasStore((state) => state.zoom)
  const showGrid = useCanvasStore((state) => state.showGrid)

  const setTool = useCallback((toolId) => {
    const editor = editorRef.current
    if (!editor) return
    if (toolId === 'rect' || toolId === 'ellipse') {
      const geoType = toolId === 'rect' ? 'rectangle' : 'ellipse'
      editor.run(() => {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, geoType)
        editor.setCurrentTool('geo')
      })
      return
    }
    editor.setCurrentTool(TOOL_MAP[toolId] || 'select')
  }, [])

  const setGrid = useCallback((enabled) => {
    const editor = editorRef.current
    if (!editor) return
    editor.updateInstanceState({ isGridMode: enabled })
  }, [])

  const setZoom = useCallback((nextZoom) => {
    const editor = editorRef.current
    if (!editor) return
    const camera = editor.getCamera()
    editor.setCamera({ ...camera, z: clampZoom(nextZoom) })
  }, [])

  const insertTemplate = useCallback((templateId, position) => {
    const editor = editorRef.current
    if (!editor) return
    const point = position || getViewportCenterPagePoint(editor)
    const shapes = buildTemplateShapes(templateId, point)
    if (!shapes.length) return
    editor.createShapes(shapes)
    editor.setSelectedShapes(shapes.map((shape) => shape.id))
    editor.setCurrentTool('select')
  }, [])

  const groupSelection = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const ids = editor.getSelectedShapeIds()
    if (ids.length < 2) return
    editor.groupShapes(ids)
  }, [])

  const ungroupSelection = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const ids = editor.getSelectedShapeIds()
    if (!ids.length) return
    editor.ungroupShapes(ids)
  }, [])

  const zoomToSelection = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.getSelectedShapeIds().length > 0) {
      editor.zoomToSelection()
      return
    }
    editor.zoomToFit()
  }, [])

  const handleDropTemplate = useCallback(
    (event) => {
      event.preventDefault()
      const editor = editorRef.current
      if (!editor) return
      const templateId =
        event.dataTransfer.getData('application/x-codesigner-template') ||
        event.dataTransfer.getData('text/plain')
      if (!templateId) return
      insertTemplate(templateId, getPagePointFromEvent(editor, event))
    },
    [insertTemplate]
  )

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleMount = useCallback(
    (editor) => {
      editorRef.current = editor
      editor.updateInstanceState({ isGridMode: showGrid })
      setTool(tool)
      const camera = editor.getCamera()
      editor.setCamera({ ...camera, z: clampZoom(zoom) })
      onReady?.({
        setTool,
        setGrid,
        setZoom,
        insertTemplate,
        groupSelection,
        ungroupSelection,
        zoomToSelection,
        undo: () => editor.undo(),
        redo: () => editor.redo(),
      })

      // 可在此根据 projectId 加载已有画布数据，或注册协同/持久化
      if (projectId) {
        // 例如: loadProjectSnapshot(editor, projectId)
      }

      if (projectId === SAMPLE_PROJECT_ID && editor.getCurrentPageShapes().length === 0) {
        seedSampleCanvas(editor)
        editor.zoomToFit()
      }
    },
    [
      groupSelection,
      insertTemplate,
      onReady,
      projectId,
      setGrid,
      setTool,
      setZoom,
      showGrid,
      tool,
      ungroupSelection,
      zoom,
      zoomToSelection,
    ]
  )

  useEffect(() => {
    setTool(tool)
  }, [setTool, tool])

  useEffect(() => {
    setGrid(showGrid)
  }, [setGrid, showGrid])

  useEffect(() => {
    setZoom(zoom)
  }, [setZoom, zoom])

  useEffect(
    () => () => {
      onReady?.(null)
    },
    [onReady]
  )

  return (
    <div className={styles.stage} onDragOver={handleDragOver} onDrop={handleDropTemplate}>
      <Tldraw
        onMount={handleMount}
        hideUi
        className={styles.tldraw}
        components={{
          // 可覆盖 tldraw 默认 UI，例如隐藏顶部菜单、使用自定义 Toolbar 等
        }}
      />
    </div>
  )
}
