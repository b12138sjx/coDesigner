import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { plainTextToHtml, truncateText } from '@/utils/documentContent'
import styles from './DocumentEditor.module.css'

const SELECTION_ACTIONS = [
  { key: 'polish', label: '润色' },
  { key: 'concise', label: '更简洁' },
  { key: 'expand', label: '扩写' },
  { key: 'summarize', label: '总结' },
  { key: 'explain', label: '解释' },
]

const PRIMARY_SELECTION_ACTION = SELECTION_ACTIONS[0]
const SECONDARY_SELECTION_ACTIONS = SELECTION_ACTIONS.slice(1)

const EMPTY_EDITOR_STATE = {
  selectedText: '',
  hasSelection: false,
  isH1: false,
  isH2: false,
  isH3: false,
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isHighlight: false,
  isBulletList: false,
  isOrderedList: false,
  isBlockquote: false,
}

function clampPosition(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeComparableText(input = '') {
  return String(input || '').replace(/\s+/g, ' ').trim()
}

function findQuoteRange(doc, quote) {
  if (!quote) return null

  let result = null

  doc.descendants((node, pos) => {
    if (result) return false
    if (!node.isText || !node.text) return true

    const index = node.text.indexOf(quote)
    if (index === -1) return true

    result = {
      from: pos + index + 1,
      to: pos + index + quote.length + 1,
    }
    return false
  })

  return result
}

function getSelectionSnapshot(editor) {
  if (!editor) return null

  const { from, to, empty } = editor.state.selection
  const text = editor.state.doc.textBetween(from, to, ' ').trim()

  if (empty || !text) return null

  return { text, from, to }
}

function resolveSelectionRange(editor, selectionContext = null) {
  if (!editor) return null

  const docSize = editor.state.doc.content.size
  const sourceText = normalizeComparableText(selectionContext?.text)

  if (
    typeof selectionContext?.from === 'number' &&
    typeof selectionContext?.to === 'number' &&
    selectionContext.to > selectionContext.from
  ) {
    const from = clampPosition(selectionContext.from, 1, docSize)
    const to = clampPosition(selectionContext.to, from, docSize)
    const currentText = normalizeComparableText(editor.state.doc.textBetween(from, to, ' '))

    if (!sourceText || currentText === sourceText) {
      return { from, to }
    }
  }

  if (selectionContext?.text) {
    return findQuoteRange(editor.state.doc, selectionContext.text)
  }

  return null
}

function ToolbarButton({ active, disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[styles.toolButton, active ? styles.toolButtonActive : ''].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  )
}

export const DocumentEditor = forwardRef(function DocumentEditor(
  {
    value,
    onChange,
    onSubmitComment,
    onAiAction,
  },
  ref
) {
  const editorCanvasRef = useRef(null)
  const editorSurfaceRef = useRef(null)
  const selectionToolbarRef = useRef(null)
  const commentComposerRef = useRef(null)
  const commentInputRef = useRef(null)
  const pointerSelectingRef = useRef(false)
  const [stableSelection, setStableSelection] = useState(null)
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState(null)
  const [commentComposerPosition, setCommentComposerPosition] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentContext, setCommentContext] = useState(null)
  const [isAiTrayOpen, setIsAiTrayOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder: '在此撰写 PRD、需求说明与设计备注。你可以随时点击右下角 AI 助手，或选中文本后直接发起润色、扩写、总结。',
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
    },
    immediatelyRender: true,
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getHTML())
    },
  })

  const editorState = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return EMPTY_EDITOR_STATE

      const selection = instance.state.selection
      const selectedText = instance.state.doc.textBetween(selection.from, selection.to, ' ').trim()
      const hasSelection = !selection.empty && Boolean(selectedText)

      return {
        selectedText,
        hasSelection,
        isH1: instance.isActive('heading', { level: 1 }),
        isH2: instance.isActive('heading', { level: 2 }),
        isH3: instance.isActive('heading', { level: 3 }),
        isBold: instance.isActive('bold'),
        isItalic: instance.isActive('italic'),
        isUnderline: instance.isActive('underline'),
        isHighlight: instance.isActive('highlight'),
        isBulletList: instance.isActive('bulletList'),
        isOrderedList: instance.isActive('orderedList'),
        isBlockquote: instance.isActive('blockquote'),
      }
    },
  }) || EMPTY_EDITOR_STATE

  useEffect(() => {
    if (!editor) return
    const nextValue = value || '<p></p>'
    if (nextValue === editor.getHTML()) return
    editor.commands.setContent(nextValue, false)
  }, [editor, value])

  useEffect(() => {
    if (!editor) return

    const commitSelection = () => {
      if (commentContext) return
      setStableSelection(getSelectionSnapshot(editor))
    }

    const handlePointerDown = () => {
      pointerSelectingRef.current = true
      if (!commentContext) {
        setStableSelection(null)
      }
    }

    const handlePointerUp = () => {
      pointerSelectingRef.current = false
      window.requestAnimationFrame(commitSelection)
    }

    const handleSelectionUpdate = () => {
      if (pointerSelectingRef.current || commentContext) return
      setStableSelection(getSelectionSnapshot(editor))
    }

    const handleKeyUp = () => {
      if (commentContext) return
      window.requestAnimationFrame(commitSelection)
    }

    const dom = editor.view.dom

    dom.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    dom.addEventListener('keyup', handleKeyUp)
    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('focus', handleSelectionUpdate)

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      dom.removeEventListener('keyup', handleKeyUp)
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('focus', handleSelectionUpdate)
    }
  }, [commentContext, editor])

  useEffect(() => {
    if (!commentContext || !commentInputRef.current) return
    commentInputRef.current.focus()
  }, [commentContext])

  useEffect(() => {
    if (commentContext || !stableSelection) {
      setIsAiTrayOpen(false)
    }
  }, [commentContext, stableSelection])

  useEffect(() => {
    if (!editor || !editorCanvasRef.current) return

    const getSelectionMetrics = (selectionContext) => {
      const range = resolveSelectionRange(editor, selectionContext)
      if (!range) return null

      const start = editor.view.coordsAtPos(range.from)
      const end = editor.view.coordsAtPos(range.to)
      const tailPos = Math.max(range.from, range.to - 1)
      const tail = editor.view.coordsAtPos(tailPos)
      const useTailAnchor = Math.abs(tail.top - start.top) > 4

      const anchorLeft = useTailAnchor
        ? Math.min(tail.left, end.left)
        : Math.min(start.left, end.left)
      const anchorRight = useTailAnchor
        ? Math.max(tail.right, end.right)
        : Math.max(start.right, end.right)
      const anchorTop = useTailAnchor
        ? Math.min(tail.top, end.top)
        : Math.min(start.top, end.top)
      const anchorBottom = useTailAnchor
        ? Math.max(tail.bottom, end.bottom)
        : Math.max(start.bottom, end.bottom)

      return {
        left: anchorLeft,
        right: anchorRight,
        top: anchorTop,
        bottom: anchorBottom,
        centerX: (anchorLeft + anchorRight) / 2,
      }
    }

    const getFloatingRect = (selectionContext, element, fallback, placement = 'top') => {
      const metrics = getSelectionMetrics(selectionContext)
      if (!metrics || !element) return null

      const hostRect = editorCanvasRef.current.getBoundingClientRect()
      const width = element.offsetWidth || fallback.width
      const height = element.offsetHeight || fallback.height
      const margin = 12
      const gap = 10

      let left = clampPosition(
        metrics.left - hostRect.left - 8,
        margin,
        Math.max(margin, hostRect.width - width - margin)
      )

      let top = placement === 'bottom'
        ? metrics.bottom - hostRect.top + gap
        : metrics.top - hostRect.top - height - gap

      if (placement === 'top' && top < margin) {
        top = metrics.bottom - hostRect.top + gap
      }

      if (placement === 'bottom' && top + height > hostRect.height - margin) {
        top = metrics.top - hostRect.top - height - gap
      }

      if (top + height > hostRect.height - margin) {
        top = Math.max(margin, hostRect.height - height - margin)
      }

      return { left, top }
    }

    const syncFloatingUi = () => {
      if (commentContext) {
        setSelectionToolbarPosition(null)
        setCommentComposerPosition(
          getFloatingRect(commentContext, commentComposerRef.current, { width: 260, height: 148 }, 'bottom')
        )
        return
      }

      setCommentComposerPosition(null)
      setSelectionToolbarPosition(
        stableSelection
          ? getFloatingRect(
              stableSelection,
              selectionToolbarRef.current,
              { width: 248, height: isAiTrayOpen ? 88 : 42 },
              'top'
            )
          : null
      )
    }

    syncFloatingUi()

    const scrollHost = editorSurfaceRef.current
    scrollHost?.addEventListener('scroll', syncFloatingUi, { passive: true })
    window.addEventListener('resize', syncFloatingUi)

    return () => {
      scrollHost?.removeEventListener('scroll', syncFloatingUi)
      window.removeEventListener('resize', syncFloatingUi)
    }
  }, [commentContext, editor, stableSelection, commentDraft, isAiTrayOpen])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        if (!editor) return false
        editor.commands.focus()
        return true
      },
      getHTML: () => editor?.getHTML() || '',
      getPlainText: () => editor?.getText() || '',
      getSelectionContext: () => {
        if (!editor) return null
        const { from, to, empty } = editor.state.selection
        const text = editor.state.doc.textBetween(from, to, ' ').trim()

        if (empty || !text) return null

        return { text, from, to }
      },
      applyAiResult: (mode, text, selectionContext = null) => {
        if (!editor || !text?.trim()) return false

        const html = plainTextToHtml(text)

        if (mode === 'replace-selection') {
          const range = resolveSelectionRange(editor, selectionContext)
          if (!range) {
            return {
              ok: false,
              reason: 'selection-changed',
            }
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, html)
            .run()
          return { ok: true }
        }

        if (mode === 'insert-at-cursor') {
          editor.chain().focus().insertContent(html).run()
          return { ok: true }
        }

        if (mode === 'append-to-end') {
          editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run()
          return { ok: true }
        }

        return { ok: false, reason: 'unsupported-mode' }
      },
      locateComment: (comment) => {
        if (!editor) return false

        if (typeof comment?.anchorOffset === 'number') {
          const from = clampPosition(comment.anchorOffset, 1, editor.state.doc.content.size)
          const to = clampPosition(comment?.selectionTo || from, from, editor.state.doc.content.size)
          editor.chain().focus().setTextSelection({ from, to }).run()
          return true
        }

        const quoteRange = findQuoteRange(editor.state.doc, comment?.quote)
        if (quoteRange) {
          editor.chain().focus().setTextSelection(quoteRange).run()
          return true
        }

        return false
      },
    }),
    [editor]
  )

  if (!editor) return null

  const handleOpenCommentComposer = () => {
    const snapshot = stableSelection || getSelectionSnapshot(editor)
    if (!snapshot) return

    setIsAiTrayOpen(false)
    setCommentDraft('')
    setCommentContext(snapshot)
    setSelectionToolbarPosition(null)
  }

  const handleAiAction = (action) => {
    const snapshot = stableSelection || getSelectionSnapshot(editor)
    if (!snapshot) return

    setIsAiTrayOpen(false)
    onAiAction?.(action, {
      action,
      text: snapshot.text,
      from: snapshot.from,
      to: snapshot.to,
    })
  }

  const handleSubmitComment = () => {
    if (!commentContext || !commentDraft.trim()) return

    onSubmitComment?.({
      quote: commentContext.text,
      selection: {
        from: commentContext.from,
        to: commentContext.to,
      },
      text: commentDraft.trim(),
    })

    setCommentDraft('')
    setStableSelection(commentContext)
    setCommentContext(null)
    editor.commands.focus()
  }

  const closeCommentComposer = () => {
    setCommentDraft('')
    setStableSelection(commentContext || stableSelection)
    setCommentContext(null)
    editor.commands.focus()
  }

  const renderSelectionToolbar = (className, style) => (
    <div
      ref={selectionToolbarRef}
      className={className}
      style={style}
    >
      <button
        type="button"
        className={styles.selectionCommentButton}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleOpenCommentComposer}
      >
        添加注释
      </button>
      <span className={styles.selectionToolbarDivider} />
      <button
        type="button"
        className={styles.selectionToolbarPrimary}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => handleAiAction(PRIMARY_SELECTION_ACTION.key)}
      >
        AI 润色
      </button>
      <button
        type="button"
        className={styles.selectionToolbarButton}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsAiTrayOpen((current) => !current)}
      >
        {isAiTrayOpen ? '收起' : '更多 AI'}
      </button>
      {isAiTrayOpen ? (
        <div className={styles.selectionAiTray}>
          {SECONDARY_SELECTION_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              className={styles.selectionToolbarButton}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleAiAction(action.key)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className={styles.wrapper}>
      <div className={styles.shell}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <ToolbarButton
              title="标题 1"
              active={editorState.isH1}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              title="标题 2"
              active={editorState.isH2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              title="标题 3"
              active={editorState.isH3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </ToolbarButton>
          </div>

          <div className={styles.toolbarGroup}>
            <ToolbarButton
              title="加粗"
              active={editorState.isBold}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              title="斜体"
              active={editorState.isItalic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </ToolbarButton>
            <ToolbarButton
              title="下划线"
              active={editorState.isUnderline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              U
            </ToolbarButton>
            <ToolbarButton
              title="高亮"
              active={editorState.isHighlight}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              Mark
            </ToolbarButton>
          </div>

          <div className={styles.toolbarGroup}>
            <ToolbarButton
              title="无序列表"
              active={editorState.isBulletList}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              • List
            </ToolbarButton>
            <ToolbarButton
              title="有序列表"
              active={editorState.isOrderedList}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              1. List
            </ToolbarButton>
            <ToolbarButton
              title="引用"
              active={editorState.isBlockquote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </ToolbarButton>
          </div>

        </div>

        <div className={styles.editorCanvas} ref={editorCanvasRef}>
          <div className={styles.editorSurface} ref={editorSurfaceRef}>
            <EditorContent editor={editor} />
          </div>

          {stableSelection && selectionToolbarPosition && !commentContext ? (
            renderSelectionToolbar(styles.selectionToolbar, {
              left: `${selectionToolbarPosition.left}px`,
              top: `${selectionToolbarPosition.top}px`,
            })
          ) : stableSelection && !commentContext ? (
            renderSelectionToolbar(styles.selectionToolbarMeasure)
          ) : null}

          {commentContext && commentComposerPosition ? (
            <div
              ref={commentComposerRef}
              className={styles.commentComposerPopover}
              style={{
                left: `${commentComposerPosition.left}px`,
                top: `${commentComposerPosition.top}px`,
              }}
            >
              <div className={styles.commentComposerHeader}>
                <div className={styles.commentAvatar}>注</div>
                <div className={styles.commentMeta}>
                  <strong>添加注释</strong>
                  <span>{truncateText(commentContext.text, 28)}</span>
                </div>
                <button type="button" className={styles.commentClose} onClick={closeCommentComposer}>
                  关闭
                </button>
              </div>
              <textarea
                ref={commentInputRef}
                className={styles.commentInput}
                rows={2}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="添加评论..."
              />
              <div className={styles.commentActions}>
                <button
                  type="button"
                  className={styles.commentGhost}
                  onClick={closeCommentComposer}
                >
                  取消
                </button>
                <button
                  type="button"
                  className={styles.commentSubmit}
                  onClick={handleSubmitComment}
                  disabled={!commentDraft.trim()}
                >
                  发送
                </button>
              </div>
            </div>
          ) : commentContext ? (
            <div ref={commentComposerRef} className={styles.commentComposerMeasure}>
              <div className={styles.commentComposerHeader}>
                <div className={styles.commentAvatar}>注</div>
                <div className={styles.commentMeta}>
                  <strong>添加注释</strong>
                  <span>{truncateText(commentContext.text, 28)}</span>
                </div>
              </div>
              <textarea className={styles.commentInput} rows={2} value="" readOnly />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
})
