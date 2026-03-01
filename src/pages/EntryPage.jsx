import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import styles from './EntryPage.module.css'

export function EntryPage() {
  const navigate = useNavigate()
  const login = useSessionStore((state) => state.login)
  const register = useSessionStore((state) => state.register)
  const enterAsGuest = useSessionStore((state) => state.enterAsGuest)
  const authError = useSessionStore((state) => state.authError)
  const clearAuthError = useSessionStore((state) => state.clearAuthError)
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleAuthEnter = (event) => {
    event.preventDefault()
    const result =
      mode === 'login'
        ? login({ username, password })
        : register({ username, password, confirmPassword })

    if (!result.ok) return
    navigate('/projects', { replace: true })
  }

  const handleGuestEnter = () => {
    clearAuthError()
    enterAsGuest()
    navigate('/projects', { replace: true })
  }

  const switchMode = (nextMode) => {
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
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={mode === 'register' ? styles.modeActive : styles.modeButton}
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
              />
            </label>
          )}

          {authError && <p className={styles.errorText}>{authError}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton}>
              {mode === 'login' ? '登录并进入' : '注册并进入'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleGuestEnter}>
              跳过登录
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
