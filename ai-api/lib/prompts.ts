type ChatPayload = {
  message: string
  messages?: Array<{ role?: string; content?: string }>
  documentHtml?: string
  selectionText?: string
}

type TransformPayload = {
  action: string
  selectedText: string
  documentHtml?: string
  surroundingContext?: Record<string, unknown>
}

function stripHtml(input = '') {
  return String(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function clipText(input = '', maxLength = 2400) {
  const source = String(input || '').trim()
  if (source.length <= maxLength) return source
  return `${source.slice(0, maxLength).trimEnd()}\n\n[truncated]`
}

function summarizeHistory(messages: ChatPayload['messages']) {
  if (!Array.isArray(messages) || messages.length === 0) return 'None'

  return messages
    .slice(-8)
    .map((message) => `${message?.role || 'user'}: ${message?.content || ''}`)
    .join('\n')
}

export function buildChatPrompt(payload: ChatPayload) {
  const documentText = clipText(stripHtml(payload.documentHtml || ''), 3200)
  const history = summarizeHistory(payload.messages)

  return [
    'Current document context:',
    documentText || 'Empty document.',
    '',
    'Recent conversation:',
    history,
    '',
    payload.selectionText ? `Current selection:\n${payload.selectionText}` : 'Current selection:\nNone',
    '',
    'User request:',
    payload.message,
  ].join('\n')
}

export function buildTransformPrompt(payload: TransformPayload) {
  const documentText = clipText(stripHtml(payload.documentHtml || ''), 2600)
  const context = payload.surroundingContext ? JSON.stringify(payload.surroundingContext) : 'None'

  return [
    `Action: ${payload.action}`,
    '',
    'Selected text:',
    payload.selectedText,
    '',
    'Document context:',
    documentText || 'Empty document.',
    '',
    `Extra context: ${context}`,
    '',
    'Return only the rewritten result text.',
  ].join('\n')
}

export function buildFallbackChat(payload: ChatPayload) {
  return {
    assistantMessage: [
      'AI 服务已接通，但当前未配置 OPENAI_API_KEY，所以这是本地 fallback 回复。',
      '',
      `你刚才的问题是：${payload.message}`,
      payload.selectionText ? `当前选中内容：${payload.selectionText}` : '当前没有选中文本。',
      '',
      '接下来只要在 ai-api 服务里补上 OPENAI_API_KEY 和 OPENAI_MODEL，就会自动切换为真实模型响应。',
    ].join('\n'),
    suggestedActions: ['补充验收标准', '拆分任务', '生成接口说明'],
  }
}

function makeConcise(text: string) {
  const sentences = text.split(/[。！？!?]/).filter(Boolean)
  return sentences.slice(0, 2).join('，').trim() || text
}

export function buildFallbackTransform(payload: TransformPayload) {
  const selected = payload.selectedText.trim()

  if (!selected) {
    return {
      resultText: '',
      explanation: '当前没有可处理的选中文本。',
    }
  }

  switch (payload.action) {
    case 'concise':
      return {
        resultText: makeConcise(selected),
        explanation: '当前返回的是本地 fallback 的“更简洁”版本。',
      }
    case 'expand':
      return {
        resultText: `${selected}\n\n补充说明：这里建议增加背景、目标、边界条件和验收标准，便于设计与开发统一理解。`,
        explanation: '当前返回的是本地 fallback 的“扩写”版本。',
      }
    case 'summarize':
      return {
        resultText: `总结：${makeConcise(selected)}`,
        explanation: '当前返回的是本地 fallback 的“总结”版本。',
      }
    case 'explain':
      return {
        resultText: `这段内容的意思是：${selected}`,
        explanation: '当前返回的是本地 fallback 的“解释”版本。',
      }
    default:
      return {
        resultText: `建议润色版本：${selected}`,
        explanation: '当前返回的是本地 fallback 的“润色”版本。',
      }
  }
}
