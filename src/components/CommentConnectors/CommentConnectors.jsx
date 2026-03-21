import styles from './CommentConnectors.module.css'

/**
 * 批注连接线组件
 * 绘制预览区选中文字到批注卡片的连接线
 */
export function CommentConnectors({ connections, containerRef }) {
  if (!connections || connections.length === 0) return null

  return (
    <svg className={styles.CommentConnectors}>
      {connections.map((conn) => (
        <line
          key={conn.id}
          x1={conn.x1}
          y1={conn.y1}
          x2={conn.x2}
          y2={conn.y2}
          data-comment-id={conn.id}
        />
      ))}
    </svg>
  )
}
