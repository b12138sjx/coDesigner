import { useState, useEffect, useMemo } from 'react'
import { useDocumentStore, createComment } from '@/stores/documentStore'
import styles from './AnnotationsPanel.module.css'

const EMPTY_DOC = { content: '', comments: [] }

export function AnnotationsPanel({
  projectId,
  pendingComment,
  onClearPending,
  collapsed = false,
  onToggleCollapse,
}) {
  const documents = useDocumentStore((state) => state.documents)
  const doc = useMemo(
    () => (projectId && documents[projectId]) ? documents[projectId] : EMPTY_DOC,
    [projectId, documents]
  )
  const addComment = useDocumentStore((s) => s.addComment)
  const removeComment = useDocumentStore((s) => s.removeComment)
  const toggleCommentResolved = useDocumentStore((s) => s.toggleCommentResolved)

  const comments = doc?.comments || []
  const [formText, setFormText] = useState('')
  const [formQuote, setFormQuote] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const pendingQuote = pendingComment?.quote
  const pendingSelection = pendingComment?.selection

  useEffect(() => {
    if (pendingQuote !== undefined || pendingSelection !== undefined) {
      setFormQuote(typeof pendingQuote === 'string' ? pendingQuote : '')
      setIsAdding(true)
    }
  }, [pendingQuote, pendingSelection])

  const startAdd = () => {
    setFormQuote('')
    setFormText('')
    setIsAdding(true)
    onClearPending?.()
  }

  const cancelAdd = () => {
    setIsAdding(false)
    setFormText('')
    setFormQuote('')
    onClearPending?.()
  }

  const submitComment = () => {
    if (!projectId) return
    const comment = createComment({ text: formText.trim(), quote: formQuote.trim() })
    addComment(projectId, comment)
    setFormText('')
    setFormQuote('')
    setIsAdding(false)
    onClearPending?.()
  }

  return (
    <aside className={[styles.panel, collapsed ? styles.panelCollapsed : ''].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h3 className={styles.title}>注释</h3>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapse}
            title={collapsed ? '展开注释面板' : '折叠注释面板'}
          >
            {collapsed ? '‹' : '›'}
          </button>
        {!isAdding && !collapsed && (
          <button type="button" className={styles.addBtn} onClick={startAdd} title="添加注释">
            + 添加
          </button>
        )}
        </div>
      </div>

      {collapsed && (
        <div className={styles.collapsedRail}>
          <button type="button" className={styles.railBtn} onClick={onToggleCollapse} title="展开注释">
            💬
          </button>
          <span className={styles.badge}>{comments.length}</span>
        </div>
      )}

      {isAdding && !collapsed && (
        <div className={styles.form}>
          {formQuote && (
            <div className={styles.field}>
              <label className={styles.label}>引用原文</label>
              <div className={styles.quote}>{formQuote}</div>
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>评论内容</label>
            <textarea
              className={styles.textarea}
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="输入注释内容…"
              rows={3}
              autoFocus
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={cancelAdd}>
              取消
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={submitComment}
              disabled={!formText.trim()}
            >
              提交
            </button>
          </div>
        </div>
      )}

      {!collapsed && <div className={styles.list}>
        {comments.length === 0 && !isAdding && (
          <p className={styles.empty}>暂无注释，点击「添加」或选中文字后在编辑器工具栏点击评论图标添加。</p>
        )}
        {comments.map((c) => (
            <div
              key={c.id}
              className={[styles.item, c.resolved ? styles.itemResolved : ''].filter(Boolean).join(' ')}
            >
              {c.quote && <div className={styles.itemQuote}>「{c.quote}」</div>}
              <p className={styles.itemText}>{c.text}</p>
              <div className={styles.itemMeta}>
                <span className={styles.itemTime}>
                  {new Date(c.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.metaBtn}
                    onClick={() => projectId && toggleCommentResolved(projectId, c.id)}
                    title={c.resolved ? '标记未解决' : '标记已解决'}
                  >
                    {c.resolved ? '↩ 未解决' : '✓ 已解决'}
                  </button>
                  <button
                    type="button"
                    className={styles.metaBtn}
                    onClick={() => projectId && removeComment(projectId, c.id)}
                    title="删除"
                  >
                    删除
                  </button>
                </span>
              </div>
            </div>
          ))}
      </div>}
    </aside>
  )
}
