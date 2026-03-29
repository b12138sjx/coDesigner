import OpenAI from 'openai'

const DEFAULT_MODEL = 'gpt-4.1-mini'

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

function readResponseText(response: any) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const textChunks: string[] = []

  for (const outputItem of response?.output || []) {
    for (const contentItem of outputItem?.content || []) {
      if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string') {
        textChunks.push(contentItem.text)
      }
    }
  }

  return textChunks.join('\n').trim()
}

export async function generateText(input: string, instructions: string) {
  const client = getClient()

  if (!client) {
    return null
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions,
    input,
  })

  return readResponseText(response)
}
