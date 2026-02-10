import { useCanvasStore } from '@/stores/canvasStore'
import styles from './Toolbar.module.css'

const TOOLS = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'draw', label: '绘制', icon: '✏' },
  { id: 'rect', label: '矩形', icon: '▢' },
  { id: 'ellipse', label: '椭圆', icon: '○' },
  { id: 'text', label: '文本', icon: 'T' },
  { id: 'arrow', label: '箭头', icon: '→' },
]

export function Toolbar() {
  const tool = useCanvasStore((s) => s.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const showGrid = useCanvasStore((s) => s.showGrid)
  const setShowGrid = useCanvasStore((s) => s.setShowGrid)
  const canUndo = useCanvasStore((s) => s.canUndo())
  const canRedo = useCanvasStore((s) => s.canRedo())
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={styles.iconBtn}
          title="撤销"
          disabled={!canUndo}
          onClick={undo}
        >
          ↶
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="重做"
          disabled={!canRedo}
          onClick={redo}
        >
          ↷
        </button>
      </div>
      <div className={styles.toolGroup}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.toolBtn, tool === t.id ? styles.toolBtnActive : ''].join(' ')}
            title={t.label}
            onClick={() => setTool(t.id)}
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
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <span>网格</span>
        </label>
      </div>
    </header>
  )
}
