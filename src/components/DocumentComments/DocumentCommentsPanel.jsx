import { stripHtml, truncateText } from '@/utils/documentContent'
import styles from './DocumentCommentsPanel.module.css'

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function DocumentCommentsPanel({
  comments = [],
  projectName,
  onLocateComment,
  onToggleResolved,
  onRemove,
}) {
  const sorted = [...comments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <p className={styles.kicker}>Annotations</p>
        <h3>注释</h3>
        <p className={styles.meta}>
          {projectName || '当前项目'} · 共 {comments.length} 条
        </p>
      </header>

      <div className={styles.list}>
        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <p>暂无注释</p>
            <span>在左侧编辑器选中文字，点「注释」即可添加。</span>
          </div>
        ) : (
          sorted.map((c) => (
            <article
              id={`doc-comment-card-${c.id}`}
              key={c.id}
              className={[styles.card, c.resolved ? styles.cardResolved : ''].join(' ')}
            >
              <div className={styles.cardTop}>
                <time className={styles.time}>{formatTime(c.createdAt)}</time>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => onLocateComment?.(c)}
                  >
                    定位
                  </button>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => onToggleResolved?.(c.id)}
                  >
                    {c.resolved ? '恢复' : '已完成'}
                  </button>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => onRemove?.(c.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
              {c.quote ? (
                <blockquote className={styles.quote}>{truncateText(stripHtml(c.quote), 200)}</blockquote>
              ) : null}
              <p className={styles.bodyText}>{c.text}</p>
            </article>
          ))
        )}
      </div>

      <footer className={styles.footer}>
        注释卡片与左侧正文之间以连线标出对应位置；点击「定位」可跳转选区。
      </footer>
    </aside>
  )
}
