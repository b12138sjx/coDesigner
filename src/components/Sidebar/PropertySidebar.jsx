import { useEffect, useMemo, useState } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { useCanvasSnapshotStore } from '@/stores/canvasSnapshotStore'
import styles from './PropertySidebar.module.css'

const TOOL_LABEL_MAP = {
  select: '选择',
  draw: '手绘',
  frame: '框架',
  rect: '矩形',
  ellipse: '椭圆',
  text: '文本',
  arrow: '连线',
}

const SHAPE_LABEL_MAP = {
  geo: '几何图形',
  text: '文本',
  arrow: '箭头',
  frame: '框架',
  draw: '手绘',
  line: '直线',
  note: '便签',
  group: '组合',
}

function formatTime(ts) {
  if (!ts) return '尚未保存'
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShapeTypes(types) {
  if (!types || types.length === 0) return '无'
  return types.map((type) => SHAPE_LABEL_MAP[type] || type).join(' / ')
}

export function PropertySidebar({ className = '', canvasApi, projectId }) {
  const tool = useCanvasStore((s) => s.tool)
  const zoom = useCanvasStore((s) => s.zoom)
  const setZoom = useCanvasStore((s) => s.setZoom)
  const snapshotEntry = useCanvasSnapshotStore((s) =>
    projectId ? s.snapshotsByProject[projectId] : null
  )

  const [selectionInfo, setSelectionInfo] = useState({
    count: 0,
    types: [],
    bounds: null,
    rotation: 0,
  })

  useEffect(() => {
    if (!canvasApi?.subscribeSelection) {
      setSelectionInfo({ count: 0, types: [], bounds: null, rotation: 0 })
      return undefined
    }
    const unsubscribe = canvasApi.subscribeSelection((nextInfo) => {
      setSelectionInfo(nextInfo || { count: 0, types: [], bounds: null, rotation: 0 })
    })
    return () => {
      unsubscribe?.()
    }
  }, [canvasApi])

  const handleZoomChange = (value) => {
    setZoom(value)
    canvasApi?.setZoom?.(value)
  }

  const selectionTitle = useMemo(() => {
    if (!selectionInfo.count) return '未选中对象'
    if (selectionInfo.count === 1) return '1 个对象'
    return `${selectionInfo.count} 个对象`
  }, [selectionInfo.count])

  return (
    <aside className={[styles.sidebar, className].filter(Boolean).join(' ')}>
      <div className={styles.section}>
        <h3 className={styles.title}>当前工具</h3>
        <p className={styles.strong}>{TOOL_LABEL_MAP[tool] || tool}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.title}>选中对象</h3>
        <p className={styles.strong}>{selectionTitle}</p>
        <div className={styles.kvList}>
          <div className={styles.kvRow}>
            <span>类型</span>
            <strong>{formatShapeTypes(selectionInfo.types)}</strong>
          </div>
          <div className={styles.kvRow}>
            <span>旋转</span>
            <strong>{selectionInfo.count ? `${selectionInfo.rotation}°` : '-'}</strong>
          </div>
          <div className={styles.kvRow}>
            <span>X / Y</span>
            <strong>
              {selectionInfo.bounds
                ? `${selectionInfo.bounds.x} / ${selectionInfo.bounds.y}`
                : '-'}
            </strong>
          </div>
          <div className={styles.kvRow}>
            <span>W / H</span>
            <strong>
              {selectionInfo.bounds
                ? `${selectionInfo.bounds.w} / ${selectionInfo.bounds.h}`
                : '-'}
            </strong>
          </div>
        </div>
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
        <div className={styles.quickZoom}>
          <button type="button" onClick={() => handleZoomChange(0.5)}>50%</button>
          <button type="button" onClick={() => handleZoomChange(1)}>100%</button>
          <button type="button" onClick={() => handleZoomChange(1.5)}>150%</button>
          <button type="button" onClick={() => handleZoomChange(2)}>200%</button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.title}>存储状态</h3>
        <div className={styles.kvList}>
          <div className={styles.kvRow}>
            <span>版本</span>
            <strong>{snapshotEntry?.version || '-'}</strong>
          </div>
          <div className={styles.kvRow}>
            <span>最后保存</span>
            <strong>{formatTime(snapshotEntry?.updatedAt)}</strong>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.title}>原型提示</h3>
        <p className={styles.muted}>左侧组件库可直接插入页面框架、按钮组、表单等低保真模块。</p>
      </div>
    </aside>
  )
}
