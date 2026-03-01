import { useCanvasStore } from '@/stores/canvasStore'
import styles from './Toolbar.module.css'

const TOOLS = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'draw', label: '绘制', icon: '✏' },
  { id: 'frame', label: '框架', icon: '▣' },
  { id: 'rect', label: '矩形', icon: '▢' },
  { id: 'ellipse', label: '椭圆', icon: '○' },
  { id: 'text', label: '文本', icon: 'T' },
  { id: 'arrow', label: '箭头', icon: '→' },
]

export function Toolbar({ canvasApi, onSetTool }) {
  const tool = useCanvasStore((s) => s.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const showGrid = useCanvasStore((s) => s.showGrid)
  const setShowGrid = useCanvasStore((s) => s.setShowGrid)
  const canUndo = useCanvasStore((s) => s.canUndo())
  const canRedo = useCanvasStore((s) => s.canRedo())
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)

  const handleSetTool = (toolId) => {
    if (onSetTool) {
      onSetTool(toolId)
      return
    }
    setTool(toolId)
    canvasApi?.setTool?.(toolId)
  }

  const handleUndo = () => {
    if (canvasApi?.undo) {
      canvasApi.undo()
      return
    }
    undo()
  }

  const handleRedo = () => {
    if (canvasApi?.redo) {
      canvasApi.redo()
      return
    }
    redo()
  }

  const handleToggleGrid = (checked) => {
    setShowGrid(checked)
    canvasApi?.setGrid?.(checked)
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={styles.iconBtn}
          title="撤销"
          disabled={!canvasApi ? !canUndo : false}
          onClick={handleUndo}
        >
          ↶
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="重做"
          disabled={!canvasApi ? !canRedo : false}
          onClick={handleRedo}
        >
          ↷
        </button>
      </div>
      <div className={styles.toolGroup}>
        <button type="button" className={styles.iconBtn} title="组合选中" onClick={() => canvasApi?.groupSelection?.()}>
          组
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="解组选中"
          onClick={() => canvasApi?.ungroupSelection?.()}
        >
          解
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="聚焦选中"
          onClick={() => canvasApi?.zoomToSelection?.()}
        >
          ⌖
        </button>
      </div>
      <div className={styles.toolGroup}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.toolBtn, tool === t.id ? styles.toolBtnActive : ''].join(' ')}
            title={t.label}
            onClick={() => handleSetTool(t.id)}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.toolLabel}>{t.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.toolGroup}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => handleToggleGrid(e.target.checked)}
          />
          <span>网格</span>
        </label>
      </div>
    </header>
  )
}
