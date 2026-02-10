import { useState } from 'react'
import styles from './LayersPanel.module.css'

const MOCK_LAYERS = [
  { id: '1', name: '页面框架', type: 'frame', visible: true },
  { id: '2', name: '按钮组', type: 'group', visible: true },
  { id: '3', name: '标题', type: 'text', visible: true },
]

export function LayersPanel({ className = '' }) {
  const [layers] = useState(MOCK_LAYERS)

  return (
    <aside className={[styles.panel, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h3 className={styles.title}>图层</h3>
      </div>
      <ul className={styles.list}>
        {layers.map((layer) => (
          <li key={layer.id} className={styles.item}>
            <span className={styles.icon}>{layer.type === 'frame' ? '▢' : layer.type === 'text' ? 'T' : '▤'}</span>
            <span className={styles.name}>{layer.name}</span>
            <button type="button" className={styles.eye} title={layer.visible ? '隐藏' : '显示'}>
              {layer.visible ? '👁' : '👁‍🗨'}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>画布中的形状将同步到此列表</p>
    </aside>
  )
}
