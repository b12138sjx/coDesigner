import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import styles from './EntryPage.module.css'

function resolveAfterEntryTarget(locationState) {
  const from = locationState?.from
  const pathname = from?.pathname || ''

  if (!pathname || pathname === '/' || pathname === '/entry') {
    return '/projects'
  }

  return `${pathname}${from?.search || ''}${from?.hash || ''}`
}

export function EntryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const hasEntered = useSessionStore((state) => state.hasEntered)
  const authReady = useSessionStore((state) => state.authReady)
  const authLoading = useSessionStore((state) => state.authLoading)
  const login = useSessionStore((state) => state.login)
  const register = useSessionStore((state) => state.register)
  const enterAsGuest = useSessionStore((state) => state.enterAsGuest)
  const authError = useSessionStore((state) => state.authError)
  const clearAuthError = useSessionStore((state) => state.clearAuthError)
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const afterEntryTarget = resolveAfterEntryTarget(location.state)

  if (!authReady) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <header className={styles.header}>
            <h1>正在恢复会话</h1>
            <p>稍等一下，我们正在确认当前登录状态。</p>
          </header>
        </div>
      </div>
    )
  }

  if (authReady && hasEntered) {
    return <Navigate to={afterEntryTarget} replace />
  }

  const handleAuthEnter = async (event) => {
    event.preventDefault()

    const result =
      mode === 'login'
        ? await login({ username, password })
        : await register({ username, password, confirmPassword })

    if (!result.ok) return
    navigate(afterEntryTarget, { replace: true })
  }

  const handleGuestEnter = () => {
    clearAuthError()
    enterAsGuest()
    navigate(afterEntryTarget, { replace: true })
  }

  const switchMode = (nextMode) => {
    if (authLoading) return
    setMode(nextMode)
    clearAuthError()
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>进入 CoDesigner</h1>
          <p>先完成登录或注册，再进入项目空间开始协作。</p>
        </header>

        <div className={styles.modeTabs}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={mode === 'login' ? styles.modeActive : styles.modeButton}
            disabled={authLoading}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={mode === 'register' ? styles.modeActive : styles.modeButton}
            disabled={authLoading}
          >
            注册
          </button>
        </div>

        <form className={styles.form} onSubmit={handleAuthEnter}>
          <label className={styles.field}>
            <span>账号</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
              disabled={authLoading}
            />
          </label>

          <label className={styles.field}>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码（至少 6 位）"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={authLoading}
            />
          </label>

          {mode === 'register' && (
            <label className={styles.field}>
              <span>确认密码</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="请再次输入密码"
                autoComplete="new-password"
                disabled={authLoading}
              />
            </label>
          )}

          {authError && <p className={styles.errorText}>{authError}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton} disabled={authLoading}>
              {authLoading ? '提交中...' : mode === 'login' ? '登录并进入' : '注册并进入'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGuestEnter}
              disabled={authLoading}
            >
              跳过登录
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
