import { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useDocumentStore } from '@/stores/documentStore'
import { DocumentEditor } from '@/components/DocumentEditor/DocumentEditor'
import { AnnotationsPanel } from '@/components/AnnotationsPanel/AnnotationsPanel'
import styles from './DocumentsPage.module.css'

const EMPTY_DOC = { content: '', comments: [] }

export function DocumentsPage() {
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const documents = useDocumentStore((state) => state.documents)
  const doc = useMemo(
    () => (projectId && documents[projectId]) ? documents[projectId] : EMPTY_DOC,
    [projectId, documents]
  )
  const setContent = useDocumentStore((state) => state.setContent)

  const [pendingComment, setPendingComment] = useState(null)
  const [commentPanelCollapsed, setCommentPanelCollapsed] = useState(false)

  const content = doc?.content ?? ''
  const handleChange = useCallback(
    (val) => {
      if (projectId) setContent(projectId, val ?? '')
    },
    [projectId, setContent]
  )

  const handleAddComment = useCallback((quote, selection) => {
    setPendingComment({ quote: quote ?? '', selection })
  }, [])

  const clearPending = useCallback(() => {
    setPendingComment(null)
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>智能文档</h1>
        <p>
          {project?.name || '当前项目'} · PRD 撰写与接口文档自动关联，文档—原型—接口动态同步
        </p>
      </header>
      <div className={styles.body}>
        <div className={styles.editorWrap}>
          <DocumentEditor
            value={content}
            onChange={handleChange}
            onAddComment={handleAddComment}
          />
        </div>
        <AnnotationsPanel
          projectId={projectId}
          pendingComment={pendingComment}
          onClearPending={clearPending}
          collapsed={commentPanelCollapsed}
          onToggleCollapse={() => setCommentPanelCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  )
}
