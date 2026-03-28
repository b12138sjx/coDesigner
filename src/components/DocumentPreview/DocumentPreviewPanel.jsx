import { stripHtml } from '@/utils/documentContent'
import styles from './DocumentPreviewPanel.module.css'

function getTextCount(html = '') {
  return stripHtml(html).replace(/\s+/g, '').length
}

export function DocumentPreviewPanel({
  content,
  comments = [],
  projectName,
}) {
  const plainText = stripHtml(content)
  const textCount = getTextCount(content)
  const hasContent = Boolean(plainText)

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Live Preview</p>
          <h3>文档预览</h3>
          <p className={styles.meta}>
            {projectName || '当前项目'} · {textCount} 字 · {comments.length} 条注释
          </p>
        </div>
      </header>

      <div className={styles.body}>
        {hasContent ? (
          <article
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className={styles.empty}>
            <strong>预览会跟随编辑器实时更新</strong>
            <p>开始输入文档后，这里会显示当前排版效果，方便你在展示时同时看到编辑态和成品态。</p>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        选中文字后会在编辑器附近弹出操作气泡，可直接添加注释或发起 AI 改写。
      </footer>
    </aside>
  )
}
