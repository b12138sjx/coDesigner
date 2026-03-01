import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const MIN_PASSWORD_LENGTH = 6

function normalizeAccount(username) {
  return (username || '').trim().toLowerCase()
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

export const useSessionStore = create(
  persist(
    (set, get) => ({
      hasEntered: false,
      authMode: null,
      user: null,
      authError: '',
      accounts: [],
      clearAuthError: () => set({ authError: '' }),
      enterAsGuest: () =>
        set({
          hasEntered: true,
          authMode: 'guest',
          authError: '',
          user: { id: 'guest', name: '访客' },
        }),
      register: ({ username, password, confirmPassword }) => {
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

        const accountKey = normalizeAccount(username)
        const state = get()
        const exists = state.accounts.some((account) => normalizeAccount(account.username) === accountKey)
        if (exists) {
          const error = '该账号已存在，请直接登录'
          set({ authError: error })
          return { ok: false, error }
        }

        const newAccount = {
          id: `u_${Date.now()}`,
          username: username.trim(),
          password,
          createdAt: Date.now(),
        }

        set({
          accounts: [...state.accounts, newAccount],
          hasEntered: true,
          authMode: 'user',
          authError: '',
          user: { id: newAccount.id, name: newAccount.username },
        })

        return { ok: true }
      },
      login: ({ username, password }) => {
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

        const accountKey = normalizeAccount(username)
        const account = get().accounts.find(
          (item) => normalizeAccount(item.username) === accountKey
        )

        if (!account) {
          const error = '账号不存在，请先注册'
          set({ authError: error })
          return { ok: false, error }
        }

        if (account.password !== password) {
          const error = '密码错误，请重试'
          set({ authError: error })
          return { ok: false, error }
        }

        set({
          hasEntered: true,
          authMode: 'user',
          authError: '',
          user: { id: account.id, name: account.username },
        })

        return { ok: true }
      },
      resetEntry: () =>
        set({
          hasEntered: false,
          authMode: null,
          authError: '',
          user: null,
        }),
    }),
    {
      name: 'codesigner-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasEntered: state.hasEntered,
        authMode: state.authMode,
        user: state.user,
        accounts: state.accounts,
      }),
    }
  )
)
