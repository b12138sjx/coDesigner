import { useEffect, useMemo, useRef } from 'react'
import { truncateText } from '@/utils/documentContent'
import styles from './DocumentAiPanel.module.css'

const QUICK_PROMPTS = [
  '帮我总结当前文档重点',
  '给这份需求补一个风险清单',
  '把当前内容改写得更适合开发评审',
]

function formatMessageTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DocumentAiPanel({
  isOpen,
  draft,
  messages,
  error,
  requestStatus,
  selectionContext,
  resultPreview,
  onClose,
  onDraftChange,
  onSend,
  onQuickPrompt,
  onApplyResult,
  onClearResult,
  layout = 'floating',
  showCloseButton = true,
}) {
  const listRef = useRef(null)
  const isBusy = requestStatus === 'pending'

  useEffect(() => {
    const host = listRef.current
    if (!host) return
    host.scrollTop = host.scrollHeight
  }, [messages, isOpen, resultPreview])

  const promptItems = useMemo(
    () =>
      QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className={styles.promptChip}
          onClick={() => onQuickPrompt(prompt)}
          disabled={isBusy}
        >
          {prompt}
        </button>
      )),
    [isBusy, onQuickPrompt]
  )

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <aside
      className={[
        styles.panel,
        layout === 'docked' ? styles.panelDocked : '',
        isOpen ? styles.panelOpen : '',
      ].filter(Boolean).join(' ')}
      aria-hidden={!isOpen}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Smart Copilot</p>
          <h3>文档 AI 助手</h3>
          <p className={styles.subtitle}>
            对话、选区改写与结果应用都在这里完成。
          </p>
        </div>
        {showCloseButton ? (
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            关闭
          </button>
        ) : null}
      </div>

      {selectionContext?.text ? (
        <div className={styles.selectionCard}>
          <span className={styles.selectionLabel}>当前作用文本</span>
          <p>{truncateText(selectionContext.text, 96)}</p>
        </div>
      ) : null}

      {resultPreview?.resultText ? (
        <div className={styles.resultCard}>
          <div className={styles.resultHead}>
            <div>
              <span className={styles.resultLabel}>AI 结果预览</span>
              <strong>{resultPreview.title || '待应用结果'}</strong>
            </div>
            <button type="button" className={styles.textBtn} onClick={onClearResult}>
              清空
            </button>
          </div>
          {resultPreview.sourceText ? (
            <p className={styles.resultSource}>原文：{truncateText(resultPreview.sourceText, 88)}</p>
          ) : null}
          <div className={styles.resultContent}>{resultPreview.resultText}</div>
          {resultPreview.explanation ? (
            <p className={styles.resultNote}>{resultPreview.explanation}</p>
          ) : null}
          <div className={styles.resultActions}>
            <button type="button" onClick={() => onApplyResult('replace-selection')}>
              替换选区
            </button>
            <button type="button" onClick={() => onApplyResult('insert-at-cursor')}>
              插入到光标
            </button>
            <button type="button" onClick={() => onApplyResult('copy')}>
              复制结果
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.prompts}>{promptItems}</div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div ref={listRef} className={styles.messages}>
        {messages.map((message) => (
          <article
            key={message.id}
            className={[
              styles.message,
              message.role === 'user' ? styles.messageUser : styles.messageAssistant,
            ].join(' ')}
          >
            <div className={styles.messageMeta}>
              <span>{message.role === 'user' ? '你' : 'AI'}</span>
              <span>{formatMessageTime(message.createdAt)}</span>
            </div>
            <div className={styles.messageBody}>{message.content}</div>
          </article>
        ))}
        {isBusy ? <p className={styles.loading}>AI 正在整理上下文并生成回复…</p> : null}
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          rows={4}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="直接提问，例如：帮我补一段验收标准，或把当前内容改成更适合技术评审的语气。"
        />
        <div className={styles.composerActions}>
          <span className={styles.hint}>Enter 发送，Shift + Enter 换行</span>
          <button type="button" onClick={() => onSend()} disabled={isBusy || !draft.trim()}>
            {isBusy ? '处理中…' : '发送'}
          </button>
        </div>
      </div>
    </aside>
  )
}
