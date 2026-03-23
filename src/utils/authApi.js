import { request } from '@/utils/apiClient'

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
