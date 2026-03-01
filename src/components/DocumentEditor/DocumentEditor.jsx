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
    const { selectedText, selection } = state
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

export function DocumentEditor({ value, onChange, onAddComment, editorRef }) {
  const theme = useUiStore((state) => state.theme)
  const colorMode = theme === 'light' ? 'light' : 'dark'

  const extraCommands = [
    {
      name: 'addComment',
      keyCommand: 'addComment',
      buttonProps: { 'aria-label': '添加评论', title: '为选中内容添加评论' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      execute: (state) => {
        if (state?.selectedText?.trim()) {
          onAddComment?.(state.selectedText, state.selection)
        } else {
          onAddComment?.('', null)
        }
      },
    },
  ]

  return (
    <div className={styles.wrapper} data-color-mode={colorMode} ref={editorRef}>
      <MDEditor
        data-color-mode={colorMode}
        value={value}
        onChange={onChange}
        height="100%"
        preview="live"
        visibleDragbar={false}
        commands={editorCommands}
        extraCommands={extraCommands}
        previewOptions={{
          rehypePlugins: [
            rehypeRaw,
            [rehypeSanitize, schema],
          ],
        }}
        textareaProps={{
          placeholder: '在此撰写 PRD、需求说明或设计备注，支持 **粗体**、*斜体*、<u>下划线</u>、<mark>高亮</mark>。选中文字后点击评论图标可添加注释。',
        }}
      />
    </div>
  )
}
