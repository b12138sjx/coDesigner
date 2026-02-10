import { useCanvasStore } from '@/stores/canvasStore'
import styles from './PropertySidebar.module.css'

export function PropertySidebar({ className = '' }) {
  const tool = useCanvasStore((s) => s.tool)
  const zoom = useCanvasStore((s) => s.zoom)
  const setZoom = useCanvasStore((s) => s.setZoom)

  return (
    <aside className={[styles.sidebar, className].filter(Boolean).join(' ')}>
      <div className={styles.section}>
        <h3 className={styles.title}>工具</h3>
        <p className={styles.muted}>当前: {tool}</p>
      </div>
      <div className={styles.section}>
        <h3 className={styles.title}>画布</h3>
        <label className={styles.row}>
          <span>缩放</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.25"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <p className={styles.muted}>{Math.round(zoom * 100)}%</p>
      </div>
      <div className={styles.section}>
        <h3 className={styles.title}>属性</h3>
        <p className={styles.muted}>选中元素后在此编辑样式与尺寸</p>
      </div>
    </aside>
  )
}
