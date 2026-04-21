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
import Underline from '@tiptap/extension-underline'
import { plainTextToHtml, truncateText } from '@/utils/documentContent'
import styles from './DocumentEditor.module.css'

const SELECTION_ACTIONS = [
  { key: 'polish',    label: '润色',    icon: '✦' },
  { key: 'concise',   label: '更简洁',  icon: '◇' },
  { key: 'expand',    label: '扩写',    icon: '⊕' },
  { key: 'summarize', label: '总结',    icon: '◎' },
  { key: 'explain',   label: '解释',    icon: '?' },
]

const PRIMARY_SELECTION_ACTION = SELECTION_ACTIONS[0]
const SECONDARY_SELECTION_ACTIONS = SELECTION_ACTIONS.slice(1)

const EMPTY_EDITOR_STATE = {
  selectedText: '', hasSelection: false,
  isH1: false, isH2: false, isH3: false,
  isBold: false, isItalic: false, isUnderline: false,
  isHighlight: false, isBulletList: false,
  isOrderedList: false, isBlockquote: false, isCode: false,
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
    result = { from: pos + index + 1, to: pos + index + quote.length + 1 }
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

function mergeCoordsRect(a, b) {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  }
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
    if (!sourceText || currentText === sourceText) return { from, to }
  }

  if (selectionContext?.text) return findQuoteRange(editor.state.doc, selectionContext.text)
  return null
}

/* ─── Toolbar primitives ─────────────────────────── */

function ToolbarButton({ active, disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[styles.toolButton, active ? styles.toolButtonActive : ''].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span className={styles.toolbarDivider} />
}

/* ─── SVG icon set ───────────────────────────────── */

const Icons = {
  Bold:        () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z"/></svg>,
  Italic:      () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M11 5h6v2h-2.5l-3 12H14v2H8v-2h2.5l3-12H11z"/></svg>,
  Underline:   () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 3v8c0 3.3 2.7 6 6 6s6-2.7 6-6V3h-2v8c0 2.2-1.8 4-4 4s-4-1.8-4-4V3H6zm-2 17h16v2H4z"/></svg>,
  Highlight:   () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M15.5 3.5L3.5 15.5l5 5L20.5 8.5l-5-5zm-7.3 14.7l-2.9-2.9L15 5.6l2.9 2.9-9.7 9.7zM3 21h3l-3-3v3z"/></svg>,
  BulletList:  () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="4" cy="6" r="2"/><rect x="8" y="5" width="12" height="2"/><circle cx="4" cy="12" r="2"/><rect x="8" y="11" width="12" height="2"/><circle cx="4" cy="18" r="2"/><rect x="8" y="17" width="12" height="2"/></svg>,
  OrderedList: () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2zm1-9h1V4H2v1h1zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2zm5-6v2h14V5zm0 6v2h14v-2zm0 6v2h14v-2z"/></svg>,
  Blockquote:  () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>,
  Undo:        () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>,
  Redo:        () => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 15.7C5 12.52 7.95 10.2 11.5 10.2c1.96 0 3.73.72 5.12 1.88L13 15.5h9V7l-3.6 3.6z"/></svg>,
}

/* ─── Main component ─────────────────────────────── */

export const DocumentEditor = forwardRef(function DocumentEditor(
  { value, onChange, onSubmitComment, onAiAction },
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
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: false }),
      Underline,
      Placeholder.configure({
        placeholder: '在此撰写 PRD、需求说明与设计备注。选中文字后可直接发起 AI 润色、扩写、总结。',
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: { class: styles.editorContent },
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
      return {
        selectedText,
        hasSelection: !selection.empty && Boolean(selectedText),
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
        isCode: instance.isActive('code'),
      }
    },
  }) || EMPTY_EDITOR_STATE

  /* ─── Sync external value ──────────────────────── */
  useEffect(() => {
    if (!editor) return
    const nextValue = value || '<p></p>'
    if (nextValue === editor.getHTML()) return
    editor.commands.setContent(nextValue, false)
  }, [editor, value])

  /* ─── Selection tracking ───────────────────────── */
  useEffect(() => {
    if (!editor) return

    const commitSelection = () => {
      if (commentContext) return
      setStableSelection(getSelectionSnapshot(editor))
    }

    const handlePointerDown = () => {
      pointerSelectingRef.current = true
      if (!commentContext) setStableSelection(null)
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
    if (commentContext || !stableSelection) setIsAiTrayOpen(false)
  }, [commentContext, stableSelection])

  /* ─── Floating UI positioning ──────────────────── */
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

      const anchorLeft   = useTailAnchor ? Math.min(tail.left, end.left)     : Math.min(start.left, end.left)
      const anchorRight  = useTailAnchor ? Math.max(tail.right, end.right)   : Math.max(start.right, end.right)
      const anchorTop    = useTailAnchor ? Math.min(tail.top, end.top)       : Math.min(start.top, end.top)
      const anchorBottom = useTailAnchor ? Math.max(tail.bottom, end.bottom) : Math.max(start.bottom, end.bottom)

      return { left: anchorLeft, right: anchorRight, top: anchorTop, bottom: anchorBottom, centerX: (anchorLeft + anchorRight) / 2 }
    }

    const getFloatingRect = (selectionContext, element, fallback, placement = 'top') => {
      const metrics = getSelectionMetrics(selectionContext)
      if (!metrics || !element) return null

      const hostRect = editorCanvasRef.current.getBoundingClientRect()
      const width  = element.offsetWidth  || fallback.width
      const height = element.offsetHeight || fallback.height
      const margin = 12
      const gap    = 10

      let left = clampPosition(
        metrics.left - hostRect.left - 8,
        margin,
        Math.max(margin, hostRect.width - width - margin)
      )

      let top = placement === 'bottom'
        ? metrics.bottom - hostRect.top + gap
        : metrics.top - hostRect.top - height - gap

      if (placement === 'top'    && top < margin) top = metrics.bottom - hostRect.top + gap
      if (placement === 'bottom' && top + height > hostRect.height - margin) top = metrics.top - hostRect.top - height - gap
      if (top + height > hostRect.height - margin) top = Math.max(margin, hostRect.height - height - margin)

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
              { width: 260, height: isAiTrayOpen ? 88 : 42 },
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
  }, [commentContext, editor, stableSelection, isAiTrayOpen])

  /* ─── Imperative handle ────────────────────────── */
  useImperativeHandle(ref, () => ({
    focus: () => { editor?.commands.focus(); return true },
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
        if (!range) return { ok: false, reason: 'selection-changed' }
        editor.chain().focus().insertContentAt(range, html).run()
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
        const to   = clampPosition(comment?.selectionTo || from, from, editor.state.doc.content.size)
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
    /**
     * 视口坐标系下的选区包围盒（如需按矩形展示时使用）。
     */
    getCommentAnchorRect: (comment) => {
      if (!editor) return null
      const docSize = editor.state.doc.content.size
      let from
      let to
      if (typeof comment?.anchorOffset === 'number') {
        from = clampPosition(comment.anchorOffset, 1, docSize)
        to = clampPosition(comment?.selectionTo || from, from, docSize)
      } else {
        const quoteRange = findQuoteRange(editor.state.doc, comment?.quote)
        if (!quoteRange) return null
        from = quoteRange.from
        to = quoteRange.to
      }
      if (to <= from) return null
      try {
        const view = editor.view
        const cFrom = view.coordsAtPos(from)
        const endPos = Math.max(from, Math.min(to - 1, docSize - 1))
        const cEnd = view.coordsAtPos(endPos)
        return mergeCoordsRect(cFrom, cEnd)
      } catch {
        return null
      }
    },
    /**
     * 注释连线终点：选区最后一个字符的中心（视口坐标），靠近正文末尾、侧栏一侧，观感更自然。
     */
    getCommentConnectorPoint: (comment) => {
      if (!editor) return null
      const docSize = editor.state.doc.content.size
      let from
      let to
      if (typeof comment?.anchorOffset === 'number') {
        from = clampPosition(comment.anchorOffset, 1, docSize)
        to = clampPosition(comment?.selectionTo || from, from, docSize)
      } else {
        const quoteRange = findQuoteRange(editor.state.doc, comment?.quote)
        if (!quoteRange) return null
        from = quoteRange.from
        to = quoteRange.to
      }
      if (to <= from) return null
      const endPos = Math.max(from, Math.min(to - 1, docSize - 1))
      try {
        const c = editor.view.coordsAtPos(endPos, 1)
        return {
          x: (c.left + c.right) / 2,
          y: (c.top + c.bottom) / 2,
        }
      } catch {
        return null
      }
    },
  }), [editor])

  if (!editor) return null

  /* ─── Handlers ─────────────────────────────────── */
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
    onAiAction?.(action, { action, text: snapshot.text, from: snapshot.from, to: snapshot.to })
  }

  const handleSubmitComment = () => {
    if (!commentContext || !commentDraft.trim()) return
    onSubmitComment?.({
      quote: commentContext.text,
      selection: { from: commentContext.from, to: commentContext.to },
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

  /* ─── Selection toolbar render ─────────────────── */
  const renderSelectionToolbar = (className, style) => (
    <div ref={selectionToolbarRef} className={className} style={style}>
      <button
        type="button"
        className={styles.selectionCommentButton}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleOpenCommentComposer}
      >
        注释
      </button>
      <span className={styles.selectionToolbarDivider} />
      <button
        type="button"
        className={styles.selectionToolbarPrimary}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleAiAction(PRIMARY_SELECTION_ACTION.key)}
      >
        {PRIMARY_SELECTION_ACTION.icon} AI 润色
      </button>
      <button
        type="button"
        className={styles.selectionToolbarButton}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsAiTrayOpen((v) => !v)}
      >
        {isAiTrayOpen ? '▲' : '更多 ▾'}
      </button>
      {isAiTrayOpen && (
        <div className={styles.selectionAiTray}>
          {SECONDARY_SELECTION_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              className={styles.selectionToolbarButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAiAction(action.key)}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  /* ─── Render ────────────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      <div className={styles.shell}>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <ToolbarButton title="标题 1" active={editorState.isH1}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </ToolbarButton>
            <ToolbarButton title="标题 2" active={editorState.isH2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </ToolbarButton>
            <ToolbarButton title="标题 3" active={editorState.isH3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          <div className={styles.toolbarGroup}>
            <ToolbarButton title="加粗 (⌘B)" active={editorState.isBold}
              onClick={() => editor.chain().focus().toggleBold().run()}>
              <Icons.Bold />
            </ToolbarButton>
            <ToolbarButton title="斜体 (⌘I)" active={editorState.isItalic}
              onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Icons.Italic />
            </ToolbarButton>
            <ToolbarButton title="下划线 (⌘U)" active={editorState.isUnderline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <Icons.Underline />
            </ToolbarButton>
            <ToolbarButton title="高亮" active={editorState.isHighlight}
              onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <Icons.Highlight />
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          <div className={styles.toolbarGroup}>
            <ToolbarButton title="无序列表" active={editorState.isBulletList}
              onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <Icons.BulletList />
            </ToolbarButton>
            <ToolbarButton title="有序列表" active={editorState.isOrderedList}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <Icons.OrderedList />
            </ToolbarButton>
            <ToolbarButton title="引用块" active={editorState.isBlockquote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Icons.Blockquote />
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          <div className={styles.toolbarGroup}>
            <ToolbarButton title="撤销 (⌘Z)"
              onClick={() => editor.chain().focus().undo().run()}>
              <Icons.Undo />
            </ToolbarButton>
            <ToolbarButton title="重做 (⌘⇧Z)"
              onClick={() => editor.chain().focus().redo().run()}>
              <Icons.Redo />
            </ToolbarButton>
          </div>
        </div>

        {/* ── Editor canvas ── */}
        <div className={styles.editorCanvas} ref={editorCanvasRef}>
          <div className={styles.editorSurface} ref={editorSurfaceRef}>
            <EditorContent editor={editor} />
          </div>

          {/* Selection toolbar */}
          {stableSelection && selectionToolbarPosition && !commentContext
            ? renderSelectionToolbar(styles.selectionToolbar, {
                left: `${selectionToolbarPosition.left}px`,
                top:  `${selectionToolbarPosition.top}px`,
              })
            : stableSelection && !commentContext
            ? renderSelectionToolbar(styles.selectionToolbarMeasure)
            : null}

          {/* Comment composer */}
          {commentContext && commentComposerPosition ? (
            <div
              ref={commentComposerRef}
              className={styles.commentComposerPopover}
              style={{
                left: `${commentComposerPosition.left}px`,
                top:  `${commentComposerPosition.top}px`,
              }}
            >
              <div className={styles.commentComposerHeader}>
                <div className={styles.commentAvatar}>注</div>
                <div className={styles.commentMeta}>
                  <strong>添加注释</strong>
                  <span>{truncateText(commentContext.text, 28)}</span>
                </div>
                <button type="button" className={styles.commentClose} onClick={closeCommentComposer}>✕</button>
              </div>
              <textarea
                ref={commentInputRef}
                className={styles.commentInput}
                rows={2}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="添加评论…"
              />
              <div className={styles.commentActions}>
                <button type="button" className={styles.commentGhost} onClick={closeCommentComposer}>取消</button>
                <button type="button" className={styles.commentSubmit} onClick={handleSubmitComment} disabled={!commentDraft.trim()}>发送</button>
              </div>
            </div>
          ) : commentContext ? (
            <div ref={commentComposerRef} className={styles.commentComposerMeasure}>
              <div className={styles.commentComposerHeader}>
                <div className={styles.commentAvatar}>注</div>
                <div className={styles.commentMeta}><strong>添加注释</strong><span>{truncateText(commentContext.text, 28)}</span></div>
              </div>
              <textarea className={styles.commentInput} rows={2} value="" readOnly />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
})
