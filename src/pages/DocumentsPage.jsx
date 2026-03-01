import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useDocumentStore } from '@/stores/documentStore'
import { DocumentEditor } from '@/components/DocumentEditor/DocumentEditor'
import { AnnotationsPanel } from '@/components/AnnotationsPanel/AnnotationsPanel'
import {
  downloadJsonFile,
  downloadTextFile,
  ensureExt,
  formatDateStamp,
  toSafeFileName,
} from '@/utils/fileExport'
import styles from './DocumentsPage.module.css'

const EMPTY_DOC = { content: '', comments: [] }

function getOffsetByLineNumber(content, lineNumber) {
  if (!content || !lineNumber || lineNumber < 1) return 0
  const lines = content.split('\n')
  const maxLine = Math.min(lineNumber, lines.length)
  let offset = 0
  for (let i = 0; i < maxLine - 1; i += 1) {
    offset += lines[i].length + 1
  }
  return offset
}

export function DocumentsPage() {
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const documents = useDocumentStore((state) => state.documents)
  const doc = useMemo(
    () => (projectId && documents[projectId]) ? documents[projectId] : EMPTY_DOC,
    [projectId, documents]
  )
  const setContent = useDocumentStore((state) => state.setContent)
  const setDocByProject = useDocumentStore((state) => state.setDocByProject)

  const [pendingComment, setPendingComment] = useState(null)
  const [commentPanelCollapsed, setCommentPanelCollapsed] = useState(false)
  const [fileTip, setFileTip] = useState('')
  const editorRef = useRef(null)
  const tipTimerRef = useRef(null)

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

  const showTip = useCallback((text) => {
    setFileTip(text)
    if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current)
    tipTimerRef.current = window.setTimeout(() => setFileTip(''), 1800)
  }, [])

  useEffect(
    () => () => {
      if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current)
    },
    []
  )

  const baseName = toSafeFileName(project?.name || 'smart_doc', 'smart_doc')

  const handleSave = useCallback(() => {
    if (!projectId) return
    setDocByProject(projectId, { content, comments: doc?.comments || [] })
    showTip('文档已保存')
  }, [content, doc?.comments, projectId, setDocByProject, showTip])

  const handleExport = useCallback(() => {
    const payload = {
      module: 'documents',
      projectId: projectId || null,
      projectName: project?.name || null,
      exportedAt: new Date().toISOString(),
      content,
      comments: doc?.comments || [],
    }
    downloadJsonFile(payload, `${baseName}_doc_${formatDateStamp()}.json`)
    downloadTextFile(content || '', `${baseName}_doc_${formatDateStamp()}.md`, 'text/markdown;charset=utf-8')
    showTip('已导出 JSON + Markdown')
  }, [baseName, content, doc?.comments, project?.name, projectId, showTip])

  const handleSaveAs = useCallback(() => {
    const suggested = `${baseName}_doc_${formatDateStamp()}`
    const inputName = window.prompt('请输入另存为文档名', suggested)
    if (inputName === null) return
    const fileName = ensureExt(toSafeFileName(inputName, suggested), '.md')
    downloadTextFile(content || '', fileName, 'text/markdown;charset=utf-8')
    showTip('已另存为 Markdown')
  }, [baseName, content, showTip])

  const handleLocateComment = useCallback(
    (comment) => {
      const host = editorRef.current
      if (!host) return
      const textarea =
        host.querySelector('textarea.w-md-editor-text-input') || host.querySelector('textarea')
      if (!textarea) return

      const fromAnchor =
        typeof comment?.anchorOffset === 'number' ? comment.anchorOffset : null
      const fromLine = getOffsetByLineNumber(content, comment?.lineStart || 1)
      const offset = Math.max(0, Math.min(fromAnchor ?? fromLine, content.length))

      textarea.focus()
      textarea.setSelectionRange(offset, offset)

      if (comment?.lineStart) {
        const roughLineHeight = 22
        textarea.scrollTop = Math.max(0, (comment.lineStart - 3) * roughLineHeight)
      }
    },
    [content]
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>智能文档</h1>
          <p>
            {project?.name || '当前项目'} · PRD 撰写与接口文档自动关联，文档—原型—接口动态同步
          </p>
        </div>
        <div className={styles.fileActions}>
          <button type="button" onClick={handleSave}>保存</button>
          <button type="button" onClick={handleSaveAs}>另存为</button>
          <button type="button" onClick={handleExport}>导出</button>
        </div>
      </header>
      {fileTip ? <p className={styles.fileTip}>{fileTip}</p> : null}
      <div className={styles.body}>
        <div className={styles.editorWrap}>
          <DocumentEditor
            value={content}
            onChange={handleChange}
            onAddComment={handleAddComment}
            editorRef={editorRef}
          />
        </div>
        <AnnotationsPanel
          projectId={projectId}
          content={content}
          pendingComment={pendingComment}
          onClearPending={clearPending}
          onLocateComment={handleLocateComment}
          collapsed={commentPanelCollapsed}
          onToggleCollapse={() => setCommentPanelCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  )
}
