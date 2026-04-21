const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(
  /\/$/,
  ''
)

export function createRequestError(message, extra = {}) {
  const error = new Error(message)
  Object.assign(error, extra)
  return error
}

export function resolveUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveAbsoluteUrl(path) {
  return new URL(resolveUrl(path), window.location.origin).toString()
}

export function resolveWebSocketUrl(path, query = {}) {
  const url = new URL(resolveAbsoluteUrl(path))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

function resolveErrorMessage(payload, fallback) {
  const message = payload?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  if (typeof payload?.code === 'string' && payload.code.trim()) {
    return payload.code
  }

  return fallback
}

export async function request(path, { method = 'GET', body, accessToken } = {}) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let response

  try {
    response = await fetch(resolveUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw createRequestError('Temporary connection issue. Please confirm the backend is running.', {
      retryable: true,
    })
  }

  const text = await response.text()
  let payload = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw createRequestError(resolveErrorMessage(payload, 'Request failed. Please try again.'), {
      status: response.status,
      retryable: response.status >= 500,
      payload,
    })
  }

  return payload
}
