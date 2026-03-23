import { Request } from 'express'

export interface ClientMeta {
  userAgent: string | null
  ipAddress: string | null
}

export interface RefreshTokenPayload {
  sub: string
  sid: string
  rid?: string
  type: 'refresh'
  iat?: number
  exp?: number
}

export interface AccessTokenPayload {
  sub: string
  username: string
  type: 'access'
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends Request {
  authUser?: AccessTokenPayload
}
