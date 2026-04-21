import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useDocumentStore, createComment } from '@/stores/documentStore'
import { useDocumentAiStore, createAiMessage, createEmptyAiSession } from '@/stores/documentAiStore'
import { DocumentEditor } from '@/components/DocumentEditor/DocumentEditor'
import { DocumentAiPanel } from '@/components/DocumentAI/DocumentAiPanel'
import { DocumentPreviewPanel } from '@/components/DocumentPreview/DocumentPreviewPanel'
import {
  downloadJsonFile,
  downloadTextFile,
  ensureExt,
  formatDateStamp,
  toSafeFileName,
} from '@/utils/fileExport'
import { aiApi } from '@/utils/aiApi'
import { truncateText } from '@/utils/documentContent'
import styles from './DocumentsPage.module.css'

const EMPTY_DOC = { content: '<p></p>', contentFormat: 'html', comments: [] }

const ACTION_LABELS = {
  polish: '润色',
  concise: '改写为更简洁版本',
  expand: '扩写',
  summarize: '总结',
  explain: '解释',
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const documents = useDocumentStore((state) => state.documents)
  const doc = useMemo(
    () => (projectId && documents[projectId]) ? documents[projectId] : EMPTY_DOC,
    [projectId, documents]
  )
  const setContent = useDocumentStore((state) => state.setContent)
  const setDocByProject = useDocumentStore((state) => state.setDocByProject)
  const addComment = useDocumentStore((state) => state.addComment)

  const aiSessions = useDocumentAiStore((state) => state.sessions)
  const ensureAiSession = useDocumentAiStore((state) => state.ensureSession)
  const setDraft = useDocumentAiStore((state) => state.setDraft)
  const pushMessage = useDocumentAiStore((state) => state.pushMessage)
  const setRequestState = useDocumentAiStore((state) => state.setRequestState)
  const setSelectionContext = useDocumentAiStore((state) => state.setSelectionContext)
  const setResultPreview = useDocumentAiStore((state) => state.setResultPreview)

  const [fileTip, setFileTip] = useState('')
  const [showCommentBtn, setShowCommentBtn] = useState(false)
  const [commentBtnPos, setCommentBtnPos] = useState({ top: 0, left: 0 })
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  const editorRef = useRef(null)
  const previewRef = useRef(null)
  const containerRef = useRef(null)
  const tipTimerRef = useRef(null)

  const content = doc?.content ?? '<p></p>'
  const contentFormat = doc?.contentFormat ?? 'html'
  const comments = doc?.comments || []
  const aiSession = projectId && aiSessions[projectId]
    ? aiSessions[projectId]
    : createEmptyAiSession()

  useEffect(() => {
    if (!projectId) return
    ensureAiSession(projectId)
  }, [ensureAiSession, projectId])

  const handleChange = useCallback(
    (val) => {
      if (projectId) {
        setContent(projectId, val ?? '<p></p>', 'html')
      }
    },
    [projectId, setContent]
  )

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
    setDocByProject(projectId, {
      content,
      contentFormat: 'html',
      comments,
    })
    showTip('文档已保存')
  }, [comments, content, projectId, setDocByProject, showTip])

  const handleExport = useCallback(() => {
    const payload = {
      module: 'documents',
      projectId: projectId || null,
      projectName: project?.name || null,
      exportedAt: new Date().toISOString(),
      content,
      contentFormat,
      comments,
    }
    downloadJsonFile(payload, `${baseName}_doc_${formatDateStamp()}.json`)
    downloadTextFile(content || '', `${baseName}_doc_${formatDateStamp()}.html`, 'text/html;charset=utf-8')
    showTip('已导出 JSON + HTML')
  }, [baseName, comments, content, contentFormat, project?.name, projectId, showTip])

  const handleSaveAs = useCallback(() => {
    const suggested = `${baseName}_doc_${formatDateStamp()}`
    const inputName = window.prompt('请输入另存为文档名', suggested)
    if (inputName === null) return
    const fileName = ensureExt(toSafeFileName(inputName, suggested), '.html')
    downloadTextFile(content || '', fileName, 'text/html;charset=utf-8')
    showTip('已另存为 HTML')
  }, [baseName, content, showTip])

  const handleBack = useCallback(() => {
    if (projectId) {
      navigate(`/project/${projectId}`)
      return
    }
    navigate('/projects')
  }, [navigate, projectId])

  const handleApplyAiResult = useCallback(
    async (mode) => {
      const preview = aiSession.resultPreview
      if (!preview?.resultText) return

      if (mode === 'copy') {
        try {
          await navigator.clipboard.writeText(preview.resultText)
          showTip('AI 结果已复制')
        } catch {
          showTip('复制失败，请重试')
        }
        return
      }

      const applied = editorRef.current?.applyAiResult(
        mode,
        preview.resultText,
        aiSession.lastSelection
      )

      if (applied?.ok) {
        showTip(
          mode === 'replace-selection'
            ? 'AI 结果已替换到选区'
            : 'AI 结果已插入到文档'
        )
        if (projectId) {
          setResultPreview(projectId, null)
        }
        return
      }

      if (applied?.reason === 'selection-changed') {
        showTip('原始选区已变化，请重新选择文本后再应用')
      }
    },
    [aiSession.lastSelection, aiSession.resultPreview, projectId, setResultPreview, showTip]
  )

  const handleSubmitComment = useCallback(
    ({ quote, selection, text }) => {
      if (!projectId || !text?.trim()) return

      addComment(
        projectId,
        createComment({
          text: text.trim(),
          quote: quote || '',
          lineStart: null,
          anchorOffset: typeof selection?.from === 'number' ? selection.from : null,
          selectionTo: typeof selection?.to === 'number' ? selection.to : null,
        })
      )

      showTip('注释已添加')
    },
    [addComment, projectId, showTip]
  )

  const handleSendAiMessage = useCallback(
    async (inputText) => {
      if (!projectId) return

      const nextText = (inputText ?? aiSession.draft).trim()
      if (!nextText) return

      const history = aiSession.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))

      pushMessage(projectId, createAiMessage({ role: 'user', content: nextText }))
      setDraft(projectId, '')
      setRequestState(projectId, 'pending', '')

      try {
        const response = await aiApi.chat({
          projectId,
          message: nextText,
          messages: history,
          documentHtml: editorRef.current?.getHTML?.() || content,
          selectionText: aiSession.lastSelection?.text || undefined,
        })

        pushMessage(
          projectId,
          createAiMessage({
            role: 'assistant',
            content: response.assistantMessage || '已收到，但当前没有生成内容。',
          })
        )
        setRequestState(projectId, 'idle', '')
      } catch (error) {
        setRequestState(
          projectId,
          'idle',
          error instanceof Error ? error.message : 'AI 请求失败，请稍后重试。'
        )
      }
    },
    [
      aiSession.draft,
      aiSession.lastSelection?.text,
      aiSession.messages,
      content,
      projectId,
      pushMessage,
      setDraft,
      setRequestState,
    ]
  )

  const handleSelectionAiAction = useCallback(
    async (action, selection) => {
      if (!projectId || !selection?.text) return

      const actionLabel = ACTION_LABELS[action] || '处理'
      const normalizedSelection = {
        text: selection.text,
        from: selection.from,
        to: selection.to,
        action,
      }

      setSelectionContext(projectId, normalizedSelection)
      setRequestState(projectId, 'pending', '')
      setResultPreview(projectId, null)
      pushMessage(
        projectId,
        createAiMessage({
          role: 'user',
          content: `${actionLabel}这段内容：${truncateText(selection.text, 120)}`,
          source: 'selection',
        })
      )

      try {
        const response = await aiApi.transform({
          projectId,
          action,
          selectedText: selection.text,
          documentHtml: editorRef.current?.getHTML?.() || content,
          surroundingContext: {
            title: project?.name || '',
          },
        })

        pushMessage(
          projectId,
          createAiMessage({
            role: 'assistant',
            content: response.explanation || `${actionLabel}已完成，你可以预览后选择替换或插入。`,
            source: 'selection',
          })
        )

        setResultPreview(projectId, {
          title: actionLabel,
          sourceText: selection.text,
          resultText: response.resultText || '',
          explanation: response.explanation || '',
        })
        setRequestState(projectId, 'idle', '')
      } catch (error) {
        setRequestState(
          projectId,
          'idle',
          error instanceof Error ? error.message : '选区 AI 请求失败，请稍后重试。'
        )
      }
    },
    [
      content,
      project?.name,
      projectId,
      pushMessage,
      setRequestState,
      setResultPreview,
      setSelectionContext,
    ]
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            返回项目
          </button>
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
        <div className={styles.workspace}>
          <div className={styles.editorWrap}>
            <DocumentEditor
              ref={editorRef}
              value={content}
              onChange={handleChange}
              onSubmitComment={handleSubmitComment}
              onAiAction={handleSelectionAiAction}
            />
          </div>
          <aside className={styles.assistantRail}>
            <DocumentAiPanel
              layout="docked"
              isOpen
              showCloseButton={false}
              draft={aiSession.draft}
              messages={aiSession.messages}
              error={aiSession.error}
              requestStatus={aiSession.requestStatus}
              selectionContext={aiSession.lastSelection}
              resultPreview={aiSession.resultPreview}
              onClose={() => {}}
              onDraftChange={(nextDraft) => projectId && setDraft(projectId, nextDraft)}
              onSend={() => handleSendAiMessage()}
              onQuickPrompt={handleSendAiMessage}
              onApplyResult={handleApplyAiResult}
              onClearResult={() => projectId && setResultPreview(projectId, null)}
            />
          </aside>
        </div>
        <aside className={styles.previewRail}>
          <DocumentPreviewPanel
            content={content}
            comments={comments}
            projectName={project?.name}
          />
        </aside>
      </div>
    </div>
  )
}
