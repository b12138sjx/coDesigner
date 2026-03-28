import type { NextRequest } from 'next/server'

const DEFAULT_ORIGIN = 'http://localhost:5173'

function resolveAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || DEFAULT_ORIGIN
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveOrigin(requestOrigin: string | null) {
  const allowedOrigins = resolveAllowedOrigins()

  if (allowedOrigins.includes('*')) {
    return requestOrigin || '*'
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }

  return allowedOrigins[0] || DEFAULT_ORIGIN
}

export function createCorsHeaders(request: NextRequest) {
  const origin = resolveOrigin(request.headers.get('origin'))
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}

export function createJsonResponse(request: NextRequest, body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  const corsHeaders = createCorsHeaders(request)

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })
  headers.set('Content-Type', 'application/json; charset=utf-8')

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

export function handleOptions(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request),
  })
}
