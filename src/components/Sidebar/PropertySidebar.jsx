import { useCanvasStore } from '@/stores/canvasStore'
import styles from './PropertySidebar.module.css'

export function PropertySidebar({ className = '', canvasApi }) {
  const tool = useCanvasStore((s) => s.tool)
  const zoom = useCanvasStore((s) => s.zoom)
  const setZoom = useCanvasStore((s) => s.setZoom)

  const handleZoomChange = (value) => {
    setZoom(value)
    canvasApi?.setZoom?.(value)
  }

  return (
    <aside className={[styles.sidebar, className].filter(Boolean).join(' ')}>
      <div className={styles.section}>
        <h3 className={styles.title}>当前工具</h3>
        <p className={styles.muted}>{tool}</p>
      </div>
      <div className={styles.section}>
        <h3 className={styles.title}>白板视图</h3>
        <label className={styles.row}>
          <span>缩放</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.25"
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
          />
        </label>
        <p className={styles.muted}>{Math.round(zoom * 100)}%</p>
      </div>
      <div className={styles.section}>
        <h3 className={styles.title}>原型提示</h3>
        <p className={styles.muted}>左侧组件库可直接插入页面框架、按钮组、表单等低保真模块</p>
      </div>
    </aside>
  )
}
