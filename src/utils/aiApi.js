const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL ?? '').replace(
  /\/$/,
  ''
)

function createAiRequestError(message, extra = {}) {
  const error = new Error(message)
  Object.assign(error, extra)
  return error
}

async function requestAi(path, payload) {
  let response

  try {
    response = await fetch(`${AI_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw createAiRequestError('AI service is temporarily unreachable. Please confirm ai-api is running.', {
      retryable: true,
    })
  }

  const text = await response.text()
  let body = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    throw createAiRequestError(body?.error || 'AI request failed. Please try again.', {
      status: response.status,
      retryable: response.status >= 500,
      body,
    })
  }

  return body || {}
}

export const aiApi = {
  chat(payload) {
    return requestAi('/api/ai/chat', payload)
  },
  transform(payload) {
    return requestAi('/api/ai/transform', payload)
  },
}
