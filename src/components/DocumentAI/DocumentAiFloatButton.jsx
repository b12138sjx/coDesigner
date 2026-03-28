import styles from './DocumentAiFloatButton.module.css'

export function DocumentAiFloatButton({ isOpen, onToggle, compact = false }) {
  return (
    <button
      type="button"
      className={[
        styles.button,
        isOpen ? styles.buttonOpen : '',
        compact ? styles.buttonCompact : '',
      ].filter(Boolean).join(' ')}
      onClick={onToggle}
      aria-label={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
      title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
    >
      <span className={styles.icon}>AI</span>
      {!compact ? <span className={styles.label}>{isOpen ? '收起助手' : '打开 AI'}</span> : null}
    </button>
  )
}
