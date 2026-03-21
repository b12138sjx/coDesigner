import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import MDEditor, { commands } from '@uiw/react-md-editor'
import MarkdownPreview from '@uiw/react-markdown-preview'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { useProjectStore } from '@/stores/projectStore'
import { useDocumentStore } from '@/stores/documentStore'
import { CommentSidebar } from '@/components/CommentSidebar/CommentSidebar'
import {
  downloadJsonFile,
  downloadTextFile,
  ensureExt,
  formatDateStamp,
  toSafeFileName,
} from '@/utils/fileExport'
import styles from './DocumentsPage.module.css'

const EMPTY_DOC = { content: '', comments: [] }

// 扩展 schema：允许 <u>、<mark> 用于下划线与高亮
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'u', 'mark'],
  attributes: { ...defaultSchema.attributes, u: [], mark: [] },
}

// 下划线命令
const underlineCommand = {
  name: 'underline',
  keyCommand: 'underline',
  buttonProps: { 'aria-label': '下划线', title: '下划线' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4v6a6 6 0 0012 0V4M4 20h16" />
    </svg>
  ),
  execute: (state, api) => {
    const { selectedText } = state
    const prefix = '<u>'
    const suffix = '</u>'
    if (selectedText && selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
      api.replaceSelection(selectedText.slice(prefix.length, -suffix.length))
    } else {
      api.replaceSelection(prefix + (selectedText || '') + suffix)
    }
  },
}

// 高亮命令
const highlightCommand = {
  name: 'highlight',
  keyCommand: 'highlight',
  buttonProps: { 'aria-label': '高亮', title: '高亮' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.24 2.53l-.52-.52A2.5 2.5 0 0012 1h-1.5A2.5 2.5 0 008 3.5V4H5.5A2.5 2.5 0 003 6.5v12A2.5 2.5 0 005.5 21h13a2.5 2.5 0 002.5-2.5v-12A2.5 2.5 0 0018.5 4H16v-.5A2.5 2.5 0 0013.5 1H12a2.5 2.5 0 00-1.76.73l-.52.52a.5.5 0 01-.35.15H8.5a.5.5 0 00-.5.5v1a.5.5 0 01-.5.5.5.5 0 000 1 .5.5 0 01.5.5v1a.5.5 0 00.5.5h2.59a.5.5 0 01.35.15l.52.52a2.5 2.5 0 001.76.73h1a2.5 2.5 0 002.5-2.5v-1a.5.5 0 01.5-.5.5.5 0 000-1 .5.5 0 01-.5-.5v-1a.5.5 0 00-.5-.5h-2.59a.5.5 0 01-.35-.15z" />
    </svg>
  ),
  execute: (state, api) => {
    const { selectedText } = state
    const prefix = '<mark>'
    const suffix = '</mark>'
    if (selectedText && selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
      api.replaceSelection(selectedText.slice(prefix.length, -suffix.length))
    } else {
      api.replaceSelection(prefix + (selectedText || '') + suffix)
    }
  },
}

// 编辑器工具栏命令
const editorCommands = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  underlineCommand,
  highlightCommand,
  commands.divider,
  commands.title,
  commands.divider,
  commands.link,
  commands.quote,
  commands.code,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.checkedListCommand,
]

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
  const [fileTip, setFileTip] = useState('')
  const [showCommentBtn, setShowCommentBtn] = useState(false)
  const [commentBtnPos, setCommentBtnPos] = useState({ top: 0, left: 0 })
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  const editorRef = useRef(null)
  const previewRef = useRef(null)
  const containerRef = useRef(null)
  const tipTimerRef = useRef(null)

  const content = doc?.content ?? ''
  const comments = doc?.comments || []

  const handleChange = useCallback(
    (val) => {
      if (projectId) setContent(projectId, val ?? '')
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
    setDocByProject(projectId, { content, comments })
    showTip('文档已保存')
  }, [content, comments, projectId, setDocByProject, showTip])

  const handleExport = useCallback(() => {
    const payload = {
      module: 'documents',
      projectId: projectId || null,
      projectName: project?.name || null,
      exportedAt: new Date().toISOString(),
      content,
      comments,
    }
    downloadJsonFile(payload, `${baseName}_doc_${formatDateStamp()}.json`)
    downloadTextFile(content || '', `${baseName}_doc_${formatDateStamp()}.md`, 'text/markdown;charset=utf-8')
    showTip('已导出 JSON + Markdown')
  }, [baseName, content, comments, project?.name, projectId, showTip])

  const handleSaveAs = useCallback(() => {
    const suggested = `${baseName}_doc_${formatDateStamp()}`
    const inputName = window.prompt('请输入另存为文档名', suggested)
    if (inputName === null) return
    const fileName = ensureExt(toSafeFileName(inputName, suggested), '.md')
    downloadTextFile(content || '', fileName, 'text/markdown;charset=utf-8')
    showTip('已另存为 Markdown')
  }, [baseName, content, showTip])

  // 预览区选中文字添加批注
  const handlePreviewMouseUp = useCallback(
    (e) => {
      if (previewCollapsed) return

      const previewEl = previewRef.current
      if (!previewEl) return

      const selection = window.getSelection()
      const selectedText = selection.toString().trim()

      if (selectedText) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const previewRect = previewEl.getBoundingClientRect()

        setPendingComment({ quote: selectedText })
        setCommentBtnPos({
          top: rect.bottom - previewRect.top + previewEl.scrollTop + 4,
          left: rect.left - previewRect.left + rect.width / 2 - 30,
        })
        setShowCommentBtn(true)
      } else {
        setShowCommentBtn(false)
      }
    },
    [previewCollapsed]
  )

  const handleAddCommentClick = useCallback(() => {
    setShowCommentBtn(false)
    window.getSelection().removeAllRanges()
  }, [])

  const clearPending = useCallback(() => {
    setPendingComment(null)
    setShowCommentBtn(false)
  }, [])

  // 定位到批注位置（高亮预览区）
  const handleLocateComment = useCallback(
    (comment) => {
      // 展开预览区
      if (previewCollapsed) {
        setPreviewCollapsed(false)
        setTimeout(() => doLocate(comment), 300)
      } else {
        doLocate(comment)
      }

      function doLocate(comment) {
        const previewEl = previewRef.current
        if (!previewEl || !comment.quote) return

        const walker = document.createTreeWalker(
          previewEl,
          NodeFilter.SHOW_TEXT,
          null,
          false
        )
        let node
        while ((node = walker.nextNode())) {
          const idx = node.textContent.indexOf(comment.quote)
          if (idx !== -1) {
            const range = document.createRange()
            range.setStart(node, idx)
            range.setEnd(node, idx + comment.quote.length)

            // 滚动到可见
            const rect = range.getBoundingClientRect()
            const previewRect = previewEl.getBoundingClientRect()
            if (rect.top < previewRect.top || rect.bottom > previewRect.bottom) {
              previewEl.scrollTop += rect.top - previewRect.top - 100
            }

            // 高亮效果
            const highlight = document.createElement('span')
            highlight.className = 'comment-highlight'
            highlight.style.background = 'rgba(59, 130, 246, 0.2)'
            highlight.style.borderRadius = '2px'
            highlight.style.transition = 'background 0.3s'
            try {
              range.surroundContents(highlight)
              setTimeout(() => {
                highlight.style.background = 'transparent'
                setTimeout(() => {
                  const parent = highlight.parentNode
                  if (parent) {
                    while (highlight.firstChild) {
                      parent.insertBefore(highlight.firstChild, highlight)
                    }
                    parent.removeChild(highlight)
                  }
                }, 300)
              }, 1500)
            } catch (e) {
              // 如果 range 跨越多个元素，忽略错误
            }
            return
          }
        }
      }
    },
    [previewCollapsed]
  )

  // 计算连接线
  const [connections, setConnections] = useState([])

  const updateConnections = useCallback(() => {
    if (!previewRef.current || !containerRef.current || previewCollapsed) {
      setConnections([])
      return
    }

    const previewEl = previewRef.current
    const containerEl = containerRef.current
    const previewRect = previewEl.getBoundingClientRect()
    const containerRect = containerEl.getBoundingClientRect()

    const newConnections = comments.map((c) => {
      if (!c.quote) return null

      // 在预览区查找对应文本
      const walker = document.createTreeWalker(
        previewEl,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )
      let node
      let previewY = 0

      outer: while ((node = walker.nextNode())) {
        const idx = node.textContent.indexOf(c.quote)
        if (idx !== -1) {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, Math.min(idx + c.quote.length, node.textContent.length))
          const rect = range.getBoundingClientRect()
          previewY = rect.top - containerRect.top + rect.height / 2
          break outer
        }
      }

      // 查找批注卡片
      const cardEl = containerEl.querySelector(`[data-comment-id="${c.id}"]`)
      if (!cardEl) return null

      const cardRect = cardEl.getBoundingClientRect()
      const cardY = cardRect.top - containerRect.top + cardRect.height / 2

      return {
        id: c.id,
        x1: previewRect.width,
        y1: previewY,
        x2: previewRect.width + 2,
        y2: cardY,
      }
    }).filter(Boolean)

    setConnections(newConnections)
  }, [comments, previewCollapsed])

  // 监听滚动更新连接线
  useEffect(() => {
    if (previewCollapsed) return

    const previewEl = previewRef.current
    if (!previewEl) return

    const handleScroll = () => {
      requestAnimationFrame(updateConnections)
    }

    previewEl.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    setTimeout(updateConnections, 100)

    return () => {
      previewEl.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [updateConnections, previewCollapsed])

  // 内容变化时更新连接线
  useEffect(() => {
    setTimeout(updateConnections, 200)
  }, [content, comments, updateConnections])

  // 高亮预览区中有批注的文字
  useEffect(() => {
    if (previewCollapsed || !previewRef.current) return

    const previewEl = previewRef.current

    // 先清除之前的高亮
    const existingHighlights = previewEl.querySelectorAll('.comment-quote-highlight')
    existingHighlights.forEach((el) => {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el)
        }
        parent.removeChild(el)
      }
    })

    // 为有批注的文字添加高亮（排除已解决的）
    const unresolvedComments = comments.filter((c) => !c.resolved)

    unresolvedComments.forEach((c) => {
      if (!c.quote) return

      const walker = document.createTreeWalker(
        previewEl,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )
      let node
      while ((node = walker.nextNode())) {
        const idx = node.textContent.indexOf(c.quote)
        if (idx !== -1) {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, idx + c.quote.length)

          const highlight = document.createElement('span')
          highlight.className = 'comment-quote-highlight'
          highlight.style.background = 'rgba(250, 204, 21, 0.4)'
          highlight.style.borderRadius = '2px'
          highlight.style.cursor = 'pointer'
          highlight.dataset.commentId = c.id

          try {
            range.surroundContents(highlight)
          } catch (e) {
            // 跨元素时忽略
          }
          break
        }
      }
    })
  }, [content, comments, previewCollapsed])

  // 点击其他地方关闭按钮
  useEffect(() => {
    if (!showCommentBtn) return

    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.commentBtn}`)) {
        setTimeout(() => {
          const selection = window.getSelection()
          if (!selection.toString().trim()) {
            setShowCommentBtn(false)
          }
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCommentBtn])

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
        {/* 编辑器 */}
        <div className={styles.editorWrap} ref={editorRef}>
          <MDEditor
            value={content}
            onChange={handleChange}
            height="100%"
            preview="edit"
            visibleDragbar={false}
            commands={editorCommands}
            extraCommands={[]}
            textareaProps={{
              placeholder: '在此撰写 PRD、需求说明或设计备注...',
            }}
          />
        </div>

        {/* 预览 + 批注 */}
        <div
          className={[styles.previewWithComments, previewCollapsed ? styles.collapsed : ''].join(' ')}
          ref={containerRef}
        >
          {/* 折叠/展开按钮 */}
          <button
            type="button"
            className={[styles.togglePreviewBtn, previewCollapsed ? styles.collapsed : ''].join(' ')}
            onClick={() => setPreviewCollapsed((v) => !v)}
            title={previewCollapsed ? '展开预览' : '折叠预览'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* 折叠状态显示 */}
          <div className={styles.collapsedBar}>
            <span>预览</span>
            <span>·</span>
            <span>{comments.length} 条批注</span>
          </div>

          {/* 预览区 */}
          <div
            className={styles.previewWrap}
            ref={previewRef}
            onMouseUp={handlePreviewMouseUp}
          >
            <MarkdownPreview
              source={content}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
            />
            {showCommentBtn && (
              <button
                type="button"
                className={styles.commentBtn}
                style={{ top: commentBtnPos.top, left: commentBtnPos.left }}
                onClick={handleAddCommentClick}
              >
                + 添加批注
              </button>
            )}
          </div>

          {/* SVG 连接线层 */}
          {!previewCollapsed && (
            <svg className={styles.connectorLayer}>
              {connections.map((conn) => (
                <line
                  key={conn.id}
                  x1={conn.x1}
                  y1={conn.y1}
                  x2={conn.x2}
                  y2={conn.y2}
                />
              ))}
            </svg>
          )}

          {/* 批注栏 */}
          {!previewCollapsed && (
            <CommentSidebar
              projectId={projectId}
              pendingComment={pendingComment}
              onClearPending={clearPending}
              onLocateComment={handleLocateComment}
            />
          )}
        </div>
      </div>
    </div>
  )
}
