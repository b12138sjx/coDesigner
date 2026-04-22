import type { NextRequest } from 'next/server'
import { handleOptions, createJsonResponse } from '@/lib/cors'
import { generateText } from '@/lib/deepseek'
import { buildTransformPrompt, buildFallbackTransform } from '@/lib/prompts'

const TRANSFORM_INSTRUCTIONS = [
  'You rewrite selected document text for product and design documentation.',
  'Respond in Simplified Chinese.',
  'Return only the transformed text without extra markdown wrappers.',
].join(' ')

export function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)

  if (!payload?.selectedText || typeof payload.selectedText !== 'string') {
    return createJsonResponse(request, { error: 'selectedText is required' }, { status: 400 })
  }

  if (!payload?.action || typeof payload.action !== 'string') {
    return createJsonResponse(request, { error: 'action is required' }, { status: 400 })
  }

  try {
    const input = buildTransformPrompt(payload)
    const generated = await generateText(input, TRANSFORM_INSTRUCTIONS)

    if (!generated) {
      return createJsonResponse(request, buildFallbackTransform(payload))
    }

    return createJsonResponse(request, {
      resultText: generated,
      explanation: `已按“${payload.action}”完成处理。`,
    })
  } catch (error) {
    return createJsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : 'Unexpected AI transform error.',
      },
      { status: 500 }
    )
  }
}
