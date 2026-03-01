function pad2(value) {
  return String(value).padStart(2, '0')
}

export function formatDateStamp(date = new Date()) {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  const second = pad2(date.getSeconds())
  return `${year}${month}${day}_${hour}${minute}${second}`
}

export function toSafeFileName(input, fallback = 'export') {
  const raw = (input || '').trim()
  const safe = raw
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return safe || fallback
}

export function ensureExt(fileName, extWithDot) {
  const ext = extWithDot.startsWith('.') ? extWithDot : `.${extWithDot}`
  return fileName.endsWith(ext) ? fileName : `${fileName}${ext}`
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadTextFile(content, fileName, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  downloadBlob(blob, fileName)
}

export function downloadJsonFile(data, fileName) {
  const content = JSON.stringify(data, null, 2)
  downloadTextFile(content, fileName, 'application/json;charset=utf-8')
}
