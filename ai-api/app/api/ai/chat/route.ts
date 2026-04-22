import type { NextRequest } from 'next/server'
import { handleOptions, createJsonResponse } from '@/lib/cors'
import { generateText } from '@/lib/deepseek'
import { buildChatPrompt, buildFallbackChat } from '@/lib/prompts'

const CHAT_INSTRUCTIONS = [
  'You are CoDesigner document copilot.',
  'Respond in Simplified Chinese.',
  'Be concise, actionable, and grounded in the provided document context.',
  'Prefer structured prose over bullet spam unless the user explicitly asks for lists.',
].join(' ')

export function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)

  if (!payload?.message || typeof payload.message !== 'string') {
    return createJsonResponse(request, { error: 'message is required' }, { status: 400 })
  }

  try {
    const input = buildChatPrompt(payload)
    const generated = await generateText(input, CHAT_INSTRUCTIONS)

    if (!generated) {
      return createJsonResponse(request, buildFallbackChat(payload))
    }

    return createJsonResponse(request, {
      assistantMessage: generated,
    })
  } catch (error) {
    return createJsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : 'Unexpected AI chat error.',
      },
      { status: 500 }
    )
  }
}
