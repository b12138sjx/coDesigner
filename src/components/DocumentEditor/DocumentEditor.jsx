import { useState, useCallback, useRef, useEffect } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { useUiStore } from '@/stores/uiStore'
import styles from './DocumentEditor.module.css'

// 扩展 schema：允许 <u>、<mark> 用于下划线与高亮
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'u', 'mark'],
  attributes: { ...defaultSchema.attributes, u: [], mark: [] },
}

// 下划线：用 HTML <u>
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

// 高亮：用 HTML <mark>
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
  commands.divider,
  commands.codeEdit,
  commands.codePreview,
]

/**
 * 获取选中文本在 Markdown 源码中的位置
 */
function getSelectionInSource(selection, previewEl, content) {
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  const selectedText = selection.toString().trim()
  if (!selectedText) return null

  // 获取选中区域在预览区的位置
  const rect = range.getBoundingClientRect()
  const previewRect = previewEl.getBoundingClientRect()

  return {
    selectedText,
    previewRect: {
      top: rect.top - previewRect.top + previewEl.scrollTop,
      left: rect.left - previewRect.left,
      width: rect.width,
      height: rect.height,
    },
  }
}

export function DocumentEditor({
  value,
  onChange,
  onAddComment,
  onPreviewSelect,
  commentMarkers, // [{ id, quote, anchorOffset }]
  editorRef,
  previewRef,
}) {
  const theme = useUiStore((state) => state.theme)
  const colorMode = theme === 'light' ? 'light' : 'dark'
  const [showCommentBtn, setShowCommentBtn] = useState(false)
  const [commentBtnPos, setCommentBtnPos] = useState({ top: 0, left: 0 })
  const [currentSelection, setCurrentSelection] = useState(null)
  const internalRef = useRef(null)

  const containerRef = editorRef || internalRef

  // 处理预览区选中
  const handlePreviewMouseUp = useCallback(
    (e) => {
      const previewEl = containerRef.current?.querySelector('.w-md-editor-preview')
      if (!previewEl) return

      const selection = window.getSelection()
      const info = getSelectionInSource(selection, previewEl, value)

      if (info && info.selectedText) {
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        const previewRect = previewEl.getBoundingClientRect()

        setCurrentSelection({
          quote: info.selectedText,
          previewRect: info.previewRect,
        })
        setCommentBtnPos({
          top: rect.bottom - previewRect.top + previewEl.scrollTop + 8,
          left: rect.left - previewRect.left + rect.width / 2 - 40,
        })
        setShowCommentBtn(true)
      } else {
        setShowCommentBtn(false)
        setCurrentSelection(null)
      }
    },
    [value, containerRef]
  )

  // 点击添加批注按钮
  const handleAddCommentClick = useCallback(() => {
    if (currentSelection) {
      onAddComment?.(currentSelection.quote, null)
      // 传递预览位置信息
      onPreviewSelect?.({
        quote: currentSelection.quote,
        previewRect: currentSelection.previewRect,
      })
    }
    setShowCommentBtn(false)
    window.getSelection().removeAllRanges()
  }, [currentSelection, onAddComment, onPreviewSelect])

  // 点击其他地方关闭按钮
  useEffect(() => {
    if (!showCommentBtn) return

    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.commentBtn}`)) {
        // 延迟关闭，避免立即消失
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

  // 绑定预览区事件
  useEffect(() => {
    const previewEl = containerRef.current?.querySelector('.w-md-editor-preview')
    if (!previewEl) return

    previewEl.addEventListener('mouseup', handlePreviewMouseUp)
    return () => previewEl.removeEventListener('mouseup', handlePreviewMouseUp)
  }, [handlePreviewMouseUp, containerRef])

  // 更新预览区 ref
  useEffect(() => {
    if (previewRef) {
      const previewEl = containerRef.current?.querySelector('.w-md-editor-preview')
      if (previewEl) {
        previewRef.current = previewEl
      }
    }
  }, [previewRef, containerRef])

  return (
    <div className={styles.wrapper} data-color-mode={colorMode} ref={containerRef}>
      <MDEditor
        data-color-mode={colorMode}
        value={value}
        onChange={onChange}
        height="100%"
        preview="live"
        visibleDragbar={false}
        commands={editorCommands}
        extraCommands={[]}
        previewOptions={{
          rehypePlugins: [rehypeRaw, [rehypeSanitize, schema]],
        }}
        textareaProps={{
          placeholder:
            '在此撰写 PRD、需求说明或设计备注，支持 **粗体**、*斜体*、<u>下划线</u>、<mark>高亮</mark>。\n\n在预览区选中文字后点击「添加批注」可添加评论。',
        }}
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
  )
}
