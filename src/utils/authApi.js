const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(
  /\/$/,
  ''
)

function createRequestError(message, extra = {}) {
  const error = new Error(message)
  Object.assign(error, extra)
  return error
}

function resolveUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function resolveErrorMessage(payload, fallback) {
  const message = payload?.message

  if (Array.isArray(message)) {
    return message.join('，')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

async function request(path, { method = 'GET', body, accessToken } = {}) {
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
    throw createRequestError('暂时无法连接服务，请确认后端已启动', {
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
    throw createRequestError(resolveErrorMessage(payload, '请求失败，请稍后重试'), {
      status: response.status,
      retryable: response.status >= 500,
    })
  }

  return payload
}

export const authApi = {
  register(payload) {
    return request('/auth/register', { method: 'POST', body: payload })
  },
  login(payload) {
    return request('/auth/login', { method: 'POST', body: payload })
  },
  refresh(refreshToken) {
    return request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    })
  },
  me(accessToken) {
    return request('/auth/me', {
      accessToken,
    })
  },
  logout(refreshToken) {
    return request('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    })
  },
}
