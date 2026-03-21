import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useDocumentStore, createComment } from '@/stores/documentStore'
import styles from './CommentSidebar.module.css'

const EMPTY_DOC = { content: '', comments: [] }

export function CommentSidebar({
  projectId,
  pendingComment,
  onClearPending,
  onLocateComment,
  commentPositions, // { [commentId]: { top, height } }
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
  const [isAdding, setIsAdding] = useState(false)

  const pendingQuote = pendingComment?.quote
  const pendingSelection = pendingComment?.selection

  useEffect(() => {
    if (pendingQuote !== undefined || pendingSelection !== undefined) {
      setFormText('')
      setIsAdding(true)
    }
  }, [pendingQuote, pendingSelection])

  const cancelAdd = useCallback(() => {
    setIsAdding(false)
    setFormText('')
    onClearPending?.()
  }, [onClearPending])

  const submitComment = useCallback(() => {
    if (!projectId || !formText.trim()) return

    const comment = createComment({
      text: formText.trim(),
      quote: pendingQuote || '',
      lineStart: pendingComment?.lineStart || null,
      anchorOffset: typeof pendingSelection?.start === 'number' ? pendingSelection.start : null,
    })
    addComment(projectId, comment)
    setFormText('')
    setIsAdding(false)
    onClearPending?.()
  }, [projectId, formText, pendingQuote, pendingComment, pendingSelection, addComment, onClearPending])

  const unresolvedCount = comments.filter((c) => !c.resolved).length

  return (
    <aside className={styles.CommentSidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>批注</h3>
        <span className={styles.count}>{unresolvedCount} 条</span>
      </div>

      {isAdding && (
        <div className={styles.addForm}>
          {pendingQuote && (
            <div className={styles.selectedQuote}>
              「{pendingQuote.slice(0, 100)}{pendingQuote.length > 100 ? '...' : ''}」
            </div>
          )}
          <textarea
            className={styles.textarea}
            value={formText}
            onChange={(e) => setFormText(e.target.value)}
            placeholder="输入批注内容…"
            rows={3}
            autoFocus
          />
          <div className={styles.formActions}>
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

      <div className={styles.list}>
        {comments.length === 0 && !isAdding && (
          <p className={styles.empty}>
            在预览区选中文字后，点击弹出的「添加批注」按钮即可添加批注。
          </p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className={[styles.item, c.resolved ? styles.itemResolved : ''].filter(Boolean).join(' ')}
            data-comment-id={c.id}
          >
            {c.quote && <div className={styles.itemQuote}>「{c.quote}」</div>}
            <p className={styles.itemText}>{c.text}</p>
            <div className={styles.itemMeta}>
              <span className={styles.itemTime}>
                {new Date(c.createdAt).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.metaBtn}
                  onClick={() => onLocateComment?.(c)}
                  title="定位到正文"
                >
                  定位
                </button>
                {c.resolved && <span className={styles.resolvedTag}>已解决</span>}
                <button
                  type="button"
                  className={styles.metaBtn}
                  onClick={() => projectId && toggleCommentResolved(projectId, c.id)}
                  title={c.resolved ? '标记未解决' : '标记已解决'}
                >
                  {c.resolved ? '取消解决' : '解决'}
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
      </div>
    </aside>
  )
}
