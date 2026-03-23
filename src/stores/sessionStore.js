import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { authApi } from '@/utils/authApi'

const MIN_PASSWORD_LENGTH = 6
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000

const EMPTY_USER_STATE = {
  hasEntered: false,
  authMode: null,
  user: null,
  accessToken: '',
  accessTokenExpiresAt: '',
  refreshToken: '',
  refreshTokenExpiresAt: '',
}

function validateUsername(username) {
  if (!username?.trim()) return '请输入账号'
  if (username.trim().length < 2) return '账号至少 2 位'
  if (username.trim().length > 24) return '账号最多 24 位'
  return ''
}

function validatePassword(password) {
  if (!password) return '请输入密码'
  if (password.length < MIN_PASSWORD_LENGTH) return `密码至少 ${MIN_PASSWORD_LENGTH} 位`
  return ''
}

function isTokenUsable(expiresAt, bufferMs = 0) {
  if (!expiresAt) return false

  const expiresAtMs = Date.parse(expiresAt)
  if (Number.isNaN(expiresAtMs)) return false

  return expiresAtMs - bufferMs > Date.now()
}

function toUserProfile(user) {
  if (!user) return null

  return {
    ...user,
    name: user.displayName || user.username || '未登录',
  }
}

function toErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function isRetryableAuthError(error) {
  if (!error || typeof error !== 'object') return false

  if (error.retryable === true) return true

  return typeof error.status === 'number' && error.status >= 500
}

export const useSessionStore = create(
  persist(
    (set, get) => {
      const applyUserSession = (payload) => {
        set({
          hasEntered: true,
          authMode: 'user',
          user: toUserProfile(payload.user),
          authError: '',
          accessToken: payload.accessToken,
          accessTokenExpiresAt: payload.accessTokenExpiresAt,
          refreshToken: payload.refreshToken,
          refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
        })
      }

      const clearUserSession = () => {
        set({
          ...EMPTY_USER_STATE,
          authError: '',
        })
      }

      const finalizeBootstrapFailure = (result) => {
        if (!result.retryable) {
          clearUserSession()
        }

        set({ authReady: true })
        return result
      }

      const refreshUserSession = async () => {
        const { refreshToken, refreshTokenExpiresAt } = get()
        if (!refreshToken || !isTokenUsable(refreshTokenExpiresAt)) {
          return {
            ok: false,
            error: '登录已失效，请重新登录',
            retryable: false,
          }
        }

        try {
          const payload = await authApi.refresh(refreshToken)
          applyUserSession(payload)
          return { ok: true, payload }
        } catch (error) {
          return {
            ok: false,
            error: toErrorMessage(error, '登录已失效，请重新登录'),
            retryable: isRetryableAuthError(error),
          }
        }
      }

      const syncCurrentUser = async () => {
        const { accessToken } = get()
        if (!accessToken) {
          return {
            ok: false,
            error: '缺少访问令牌',
            retryable: false,
          }
        }

        try {
          const payload = await authApi.me(accessToken)
          set({
            hasEntered: true,
            authMode: 'user',
            user: toUserProfile(payload.user),
            authError: '',
          })

          return { ok: true, payload }
        } catch (error) {
          return {
            ok: false,
            error: toErrorMessage(error, '获取当前用户失败'),
            retryable: isRetryableAuthError(error),
          }
        }
      }

      return {
        ...EMPTY_USER_STATE,
        authError: '',
        authLoading: false,
        authReady: false,
        authInitializing: false,
        clearAuthError: () => set({ authError: '' }),
        enterAsGuest: () =>
          set({
            hasEntered: true,
            authMode: 'guest',
            user: { id: 'guest', username: 'guest', displayName: '访客', name: '访客' },
            authError: '',
            accessToken: '',
            accessTokenExpiresAt: '',
            refreshToken: '',
            refreshTokenExpiresAt: '',
            authReady: true,
          }),
        initializeAuth: async () => {
          const state = get()
          if (state.authReady || state.authInitializing) {
            return { ok: true }
          }

          set({ authInitializing: true })

          try {
            const currentState = get()

            if (currentState.authMode !== 'user') {
              set({ authReady: true })
              return { ok: true }
            }

            if (!currentState.refreshToken) {
              clearUserSession()
              set({ authReady: true })
              return { ok: false, error: '缺少刷新令牌', retryable: false }
            }

            if (!isTokenUsable(currentState.accessTokenExpiresAt, TOKEN_EXPIRY_BUFFER_MS)) {
              const refreshResult = await refreshUserSession()
              if (!refreshResult.ok) {
                return finalizeBootstrapFailure(refreshResult)
              }
            }

            let meResult = await syncCurrentUser()
            if (!meResult.ok) {
              const refreshResult = await refreshUserSession()
              if (!refreshResult.ok) {
                return finalizeBootstrapFailure(refreshResult)
              }

              meResult = await syncCurrentUser()
            }

            if (!meResult.ok) {
              return finalizeBootstrapFailure(meResult)
            }

            set({ authReady: true })
            return { ok: true }
          } finally {
            set({ authInitializing: false })
          }
        },
        register: async ({ username, password, confirmPassword }) => {
          const usernameError = validateUsername(username)
          if (usernameError) {
            set({ authError: usernameError })
            return { ok: false, error: usernameError }
          }

          const passwordError = validatePassword(password)
          if (passwordError) {
            set({ authError: passwordError })
            return { ok: false, error: passwordError }
          }

          if (password !== confirmPassword) {
            const error = '两次密码输入不一致'
            set({ authError: error })
            return { ok: false, error }
          }

          set({ authLoading: true, authError: '' })

          try {
            const payload = await authApi.register({
              username: username.trim(),
              password,
            })

            applyUserSession(payload)
            set({ authReady: true })
            return { ok: true }
          } catch (error) {
            const message = toErrorMessage(error)
            set({ authError: message })
            return { ok: false, error: message }
          } finally {
            set({ authLoading: false })
          }
        },
        login: async ({ username, password }) => {
          const usernameError = validateUsername(username)
          if (usernameError) {
            set({ authError: usernameError })
            return { ok: false, error: usernameError }
          }

          const passwordError = validatePassword(password)
          if (passwordError) {
            set({ authError: passwordError })
            return { ok: false, error: passwordError }
          }

          set({ authLoading: true, authError: '' })

          try {
            const payload = await authApi.login({
              username: username.trim(),
              password,
            })

            applyUserSession(payload)
            set({ authReady: true })
            return { ok: true }
          } catch (error) {
            const message = toErrorMessage(error)
            set({ authError: message })
            return { ok: false, error: message }
          } finally {
            set({ authLoading: false })
          }
        },
        logout: async () => {
          const { authMode, refreshToken } = get()

          if (authMode !== 'user') {
            clearUserSession()
            set({ authReady: true })
            return { ok: true }
          }

          set({ authLoading: true, authError: '' })

          try {
            if (refreshToken) {
              await authApi.logout(refreshToken)
            }
          } catch {
            // Logout should be best-effort so the local session can still be cleared.
          } finally {
            clearUserSession()
            set({
              authLoading: false,
              authReady: true,
            })
          }

          return { ok: true }
        },
        resetEntry: () => {
          clearUserSession()
          set({ authReady: true })
        },
      }
    },
    {
      name: 'codesigner-session',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasEntered: state.hasEntered,
        authMode: state.authMode,
        user: state.user,
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshToken: state.refreshToken,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
      }),
    }
  )
)
