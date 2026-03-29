function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyInlineMarkdown(input = '') {
  return escapeHtml(input)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/&lt;mark&gt;([\s\S]+?)&lt;\/mark&gt;/g, '<mark>$1</mark>')
}

function flushParagraph(buffer, parts) {
  if (!buffer.length) return
  parts.push(`<p>${applyInlineMarkdown(buffer.join(' '))}</p>`)
  buffer.length = 0
}

function closeList(state, parts) {
  if (!state.type) return
  parts.push(state.type === 'ordered' ? '</ol>' : '</ul>')
  state.type = null
}

export function markdownToHtml(markdown = '') {
  const source = String(markdown || '').trim()

  if (!source) {
    return '<p></p>'
  }

  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const parts = []
  const paragraphBuffer = []
  const listState = { type: null }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph(paragraphBuffer, parts)
      closeList(listState, parts)
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph(paragraphBuffer, parts)
      closeList(listState, parts)
      const level = heading[1].length
      parts.push(`<h${level}>${applyInlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/)
    if (ordered) {
      flushParagraph(paragraphBuffer, parts)
      if (listState.type !== 'ordered') {
        closeList(listState, parts)
        listState.type = 'ordered'
        parts.push('<ol>')
      }
      parts.push(`<li>${applyInlineMarkdown(ordered[2])}</li>`)
      continue
    }

    const unordered = line.match(/^[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph(paragraphBuffer, parts)
      if (listState.type !== 'unordered') {
        closeList(listState, parts)
        listState.type = 'unordered'
        parts.push('<ul>')
      }
      parts.push(`<li>${applyInlineMarkdown(unordered[1])}</li>`)
      continue
    }

    if (line.startsWith('> ')) {
      flushParagraph(paragraphBuffer, parts)
      closeList(listState, parts)
      parts.push(`<blockquote><p>${applyInlineMarkdown(line.slice(2))}</p></blockquote>`)
      continue
    }

    closeList(listState, parts)
    paragraphBuffer.push(line)
  }

  flushParagraph(paragraphBuffer, parts)
  closeList(listState, parts)

  return parts.length ? parts.join('') : '<p></p>'
}

export function plainTextToHtml(text = '') {
  const source = String(text || '').trim()

  if (!source) {
    return '<p></p>'
  }

  return source
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br />')
      return `<p>${lines}</p>`
    })
    .join('')
}

export function stripHtml(html = '') {
  const source = String(html || '')

  if (!source) return ''

  if (typeof window !== 'undefined' && typeof window.DOMParser === 'function') {
    const parser = new window.DOMParser()
    const doc = parser.parseFromString(source, 'text/html')
    return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim()
  }

  return source
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function truncateText(input = '', maxLength = 140) {
  const source = String(input || '').trim()
  if (source.length <= maxLength) return source
  return `${source.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function normalizeDocumentRecord(record = {}) {
  const rawContent = typeof record.content === 'string' ? record.content : ''
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(rawContent)
  const normalizedComments = Array.isArray(record.comments) ? record.comments : []

  if (record.contentFormat === 'html') {
    return {
      ...record,
      content: rawContent || '<p></p>',
      contentFormat: 'html',
      comments: normalizedComments,
    }
  }

  if (hasHtmlTags) {
    return {
      ...record,
      content: rawContent || '<p></p>',
      contentFormat: 'html',
      comments: normalizedComments,
    }
  }

  return {
    ...record,
    content: markdownToHtml(rawContent),
    contentFormat: 'html',
    comments: normalizedComments,
  }
}
