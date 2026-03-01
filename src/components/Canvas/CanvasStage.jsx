import { useCallback, useEffect, useRef } from 'react'
import { Tldraw, GeoShapeGeoStyle, createShapeId } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCanvasStore } from '@/stores/canvasStore'
import { useCanvasSnapshotStore } from '@/stores/canvasSnapshotStore'
import { DEMO_CANVAS_PROJECT_IDS } from '@/utils/mockData'
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

function round2(value) {
  return Math.round(value * 100) / 100
}

function radToDeg(rad) {
  return round2((rad * 180) / Math.PI)
}

function buildSelectionInfo(editor) {
  const selectedIds = editor.getSelectedShapeIds()
  const selectedShapes = editor.getSelectedShapes()
  const bounds = editor.getSelectionPageBounds()
  const rotation = editor.getSelectionRotation()
  const types = Array.from(new Set(selectedShapes.map((shape) => shape.type)))

  return {
    count: selectedIds.length,
    ids: selectedIds.map((id) => String(id)),
    types,
    bounds: bounds
      ? {
          x: round2(bounds.x),
          y: round2(bounds.y),
          w: round2(bounds.w),
          h: round2(bounds.h),
        }
      : null,
    rotation: radToDeg(rotation),
  }
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
    case 'hero_banner':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 420,
          y: center.y - 130,
          props: { geo: 'rectangle', w: 840, h: 260, text: '首屏 Banner 背景区' },
        },
        {
          id: createShapeId(),
          type: 'text',
          x: center.x - 360,
          y: center.y - 88,
          props: { text: '一句话价值主张' },
        },
        {
          id: createShapeId(),
          type: 'text',
          x: center.x - 360,
          y: center.y - 48,
          props: { text: '说明：突出核心能力，辅助用户理解功能场景。' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 360,
          y: center.y + 12,
          props: { geo: 'rectangle', w: 140, h: 46, text: '立即开始' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 200,
          y: center.y + 12,
          props: { geo: 'rectangle', w: 140, h: 46, text: '查看演示' },
        },
      ]
    case 'side_nav_layout':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 460,
          y: center.y - 210,
          props: { geo: 'rectangle', w: 920, h: 420, text: '页面容器' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 440,
          y: center.y - 190,
          props: { geo: 'rectangle', w: 220, h: 380, text: '侧栏导航' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 200,
          y: center.y - 190,
          props: { geo: 'rectangle', w: 640, h: 80, text: '内容头部 / 筛选区' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 200,
          y: center.y - 92,
          props: { geo: 'rectangle', w: 640, h: 282, text: '主内容区' },
        },
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
    case 'table_block':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 420,
          y: center.y - 150,
          props: { geo: 'rectangle', w: 840, h: 54, text: '表头：名称 | 状态 | 负责人 | 更新时间' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 420,
          y: center.y - 84,
          props: { geo: 'rectangle', w: 840, h: 62, text: '行 1' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 420,
          y: center.y - 10,
          props: { geo: 'rectangle', w: 840, h: 62, text: '行 2' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 420,
          y: center.y + 64,
          props: { geo: 'rectangle', w: 840, h: 62, text: '行 3' },
        },
      ]
    case 'stats_cards':
      return [
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 350,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 220, h: 160, text: '指标 A\n1,284' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x - 110,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 220, h: 160, text: '指标 B\n87%' },
        },
        {
          id: createShapeId(),
          type: 'geo',
          x: center.x + 130,
          y: center.y - 80,
          props: { geo: 'rectangle', w: 220, h: 160, text: '指标 C\n36' },
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
  editor.createShapes(buildSampleShowcaseShapes(center))
}

/**
 * 基于 tldraw 的画布：支持绘制、形状、文本、箭头等，为后续多人协同与持久化预留接口
 */
export function CanvasStage({ projectId, onReady }) {
  const editorRef = useRef(null)
  const unlistenRef = useRef(null)
  const saveTimerRef = useRef(null)
  const selectionListenersRef = useRef(new Set())
  const tool = useCanvasStore((state) => state.tool)
  const zoom = useCanvasStore((state) => state.zoom)
  const showGrid = useCanvasStore((state) => state.showGrid)
  const saveSnapshot = useCanvasSnapshotStore((state) => state.saveSnapshot)

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

  const notifySelectionListeners = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const info = buildSelectionInfo(editor)
    selectionListenersRef.current.forEach((listener) => {
      try {
        listener(info)
      } catch {
        // ignore individual listener errors
      }
    })
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

      const persistNow = () => {
        if (!projectId) return
        try {
          saveSnapshot(projectId, editor.getSnapshot())
        } catch {
          // 忽略本地持久化失败，避免影响绘制主流程
        }
      }

      const queuePersist = () => {
        if (!projectId) return
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = window.setTimeout(() => {
          persistNow()
        }, 320)
      }

      onReady?.({
        setTool,
        setGrid,
        setZoom,
        insertTemplate,
        groupSelection,
        ungroupSelection,
        zoomToSelection,
        getSelectionInfo: () => buildSelectionInfo(editor),
        subscribeSelection: (listener) => {
          if (typeof listener !== 'function') return () => {}
          selectionListenersRef.current.add(listener)
          listener(buildSelectionInfo(editor))
          return () => {
            selectionListenersRef.current.delete(listener)
          }
        },
        getSnapshot: () => editor.getSnapshot(),
        saveNow: persistNow,
        undo: () => editor.undo(),
        redo: () => editor.redo(),
      })

      if (projectId) {
        const storedSnapshot = useCanvasSnapshotStore.getState().getSnapshot(projectId)
        if (storedSnapshot) {
          try {
            editor.loadSnapshot(storedSnapshot)
          } catch {
            // 快照异常时使用空白/种子兜底
          }
        }
      }

      const shouldSeedDemo =
        projectId &&
        DEMO_CANVAS_PROJECT_IDS.includes(projectId) &&
        !useCanvasSnapshotStore.getState().getSnapshot(projectId) &&
        editor.getCurrentPageShapes().length === 0
      if (shouldSeedDemo) {
        seedSampleCanvas(editor)
        editor.zoomToFit()
        queuePersist()
      }

      unlistenRef.current = editor.store.listen(() => {
        queuePersist()
        notifySelectionListeners()
      })

      notifySelectionListeners()
    },
    [
      groupSelection,
      insertTemplate,
      notifySelectionListeners,
      onReady,
      projectId,
      saveSnapshot,
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
      const editor = editorRef.current
      if (editor && projectId) {
        try {
          saveSnapshot(projectId, editor.getSnapshot())
        } catch {
          // ignore
        }
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
      selectionListenersRef.current.clear()
      onReady?.(null)
    },
    [onReady, projectId, saveSnapshot]
  )

  return (
    <div className={styles.stage} onDragOver={handleDragOver} onDrop={handleDropTemplate}>
      <Tldraw
        onMount={handleMount}
        hideUi={false}
        className={styles.tldraw}
        components={{
          // 可覆盖 tldraw 默认 UI，例如隐藏顶部菜单、使用自定义 Toolbar 等
        }}
      />
    </div>
  )
}
