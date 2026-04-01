import type { NextRequest } from 'next/server'
import { createJsonResponse, handleOptions } from '@/lib/cors'

export function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export function GET(request: NextRequest) {
  return createJsonResponse(request, {
    status: 'ok',
    service: 'ai-api',
    timestamp: new Date().toISOString(),
  })
}
