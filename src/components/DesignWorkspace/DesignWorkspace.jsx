import { useState } from 'react'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { CanvasStage } from '@/components/Canvas/CanvasStage'
import { PropertySidebar } from '@/components/Sidebar/PropertySidebar'
import { PrototypePalette } from '@/components/PrototypePalette/PrototypePalette'
import { useCanvasStore } from '@/stores/canvasStore'
import styles from './DesignWorkspace.module.css'

export function DesignWorkspace({ projectId }) {
  const [canvasApi, setCanvasApi] = useState(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const tool = useCanvasStore((state) => state.tool)
  const setTool = useCanvasStore((state) => state.setTool)

  const handleSetTool = (toolId) => {
    setTool(toolId)
    canvasApi?.setTool(toolId)
  }

  return (
    <div className={styles.workspace}>
      <Toolbar projectId={projectId} canvasApi={canvasApi} />
      <div className={styles.body}>
        <aside
          className={[
            styles.panelShell,
            styles.leftShell,
            leftCollapsed ? styles.panelCollapsed : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setLeftCollapsed((prev) => !prev)}
            title={leftCollapsed ? '展开左侧组件库' : '折叠左侧组件库'}
          >
            {leftCollapsed ? '›' : '‹'}
          </button>
          {!leftCollapsed ? (
            <PrototypePalette
              className={styles.layers}
              activeTool={tool}
              onSetTool={handleSetTool}
              onInsertTemplate={canvasApi?.insertTemplate}
            />
          ) : (
            <div className={styles.panelRail}>
              <button type="button" onClick={() => handleSetTool('select')} title="选择工具">↖</button>
              <button type="button" onClick={() => handleSetTool('draw')} title="手绘工具">✏</button>
              <button type="button" onClick={() => canvasApi?.insertTemplate?.('page_frame')} title="插入页面框架">🧱</button>
              <button
                type="button"
                onClick={() => canvasApi?.insertTemplate?.('button_group')}
                title="插入按钮组"
              >
                🔘
              </button>
            </div>
          )}
        </aside>
        <div className={styles.canvasWrap}>
          <CanvasStage key={projectId} projectId={projectId} onReady={setCanvasApi} />
        </div>
        <aside
          className={[
            styles.panelShell,
            styles.rightShell,
            rightCollapsed ? styles.panelCollapsed : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setRightCollapsed((prev) => !prev)}
            title={rightCollapsed ? '展开右侧属性面板' : '折叠右侧属性面板'}
          >
            {rightCollapsed ? '‹' : '›'}
          </button>
          {!rightCollapsed ? (
            <PropertySidebar
              className={styles.sidebar}
              canvasApi={canvasApi}
              projectId={projectId}
            />
          ) : (
            <div className={styles.panelRail}>
              <button type="button" onClick={() => canvasApi?.zoomToSelection?.()} title="聚焦选中">⌖</button>
              <button type="button" onClick={() => canvasApi?.setZoom?.(1)} title="重置到 100%">100%</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
