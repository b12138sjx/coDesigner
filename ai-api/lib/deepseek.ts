const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_BASE_URL = 'https://api.deepseek.com'

function getEnv(name: string) {
  return process.env[name]?.trim() || ''
}

function getConfig() {
  const apiKey = getEnv('DEEPSEEK_API_KEY') || getEnv('OPENAI_API_KEY')
  const model = getEnv('DEEPSEEK_MODEL') || getEnv('OPENAI_MODEL') || DEFAULT_MODEL
  const baseUrl = (getEnv('DEEPSEEK_BASE_URL') || DEFAULT_BASE_URL).replace(/\/$/, '')
  return { apiKey, model, baseUrl }
}

function readAssistantText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    const chunks = content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .filter(Boolean)
    return chunks.join('\n').trim()
  }

  return ''
}

export async function generateText(input: string, instructions: string) {
  const { apiKey, model, baseUrl } = getConfig()
  if (!apiKey) return null

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: input },
      ],
      stream: false,
    }),
  })

  const text = await response.text()
  let body: any = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      body?.error?.message || body?.error || `DeepSeek request failed with status ${response.status}`
    throw new Error(String(errorMessage))
  }

  return readAssistantText(body)
}
