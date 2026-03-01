import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import styles from './AppSidebar.module.css'

function resolveProjectIdFromPath(pathname) {
  const match = pathname.match(/^\/(?:project|design|documents|api)\/([^/]+)/)
  return match?.[1] || null
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const currentProjectId = useProjectStore((state) => state.currentProjectId)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const getProjectById = useProjectStore((state) => state.getProjectById)
  const authMode = useSessionStore((state) => state.authMode)
  const user = useSessionStore((state) => state.user)
  const resetEntry = useSessionStore((state) => state.resetEntry)
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)

  const inProjectContext = /^\/(?:project|design|documents|api)\//.test(location.pathname)
  const routeProjectId = resolveProjectIdFromPath(location.pathname)
  const activeProjectId = routeProjectId || (inProjectContext ? currentProjectId : null)
  const activeProject = activeProjectId ? getProjectById(activeProjectId) : null
  const userName = user?.name || '未登录'
  const userInitial = userName.slice(0, 1)

  const moduleItems = activeProjectId
    ? [
        { to: `/design/${activeProjectId}`, label: '画布设计', icon: '✏️' },
        { to: `/documents/${activeProjectId}`, label: '智能文档', icon: '📄' },
        { to: `/api/${activeProjectId}`, label: '接口协同', icon: '🔌' },
      ]
    : []

  const handleResetEntry = () => {
    resetEntry()
    navigate('/entry', { replace: true })
  }

  const handleProjectSwitch = (event) => {
    const nextProjectId = event.target.value
    if (!nextProjectId) return
    setCurrentProject(nextProjectId)
    navigate(`/project/${nextProjectId}`)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>Co</span>
        <div className={styles.logoText}>
          <strong>Designer</strong>
          <span>Collaborative Workspace</span>
        </div>
      </div>

      <div className={styles.userPanel}>
        <span className={styles.userAvatar}>{userInitial}</span>
        <div className={styles.userMeta}>
          <p>{authMode === 'guest' ? '访客模式' : '账号模式'}</p>
          <strong>{userName}</strong>
        </div>
        <button
          type="button"
          className={styles.themeButton}
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
        >
          {theme === 'dark' ? '🌞' : '🌙'}
        </button>
      </div>

      <nav className={styles.nav}>
        <p className={styles.navSection}>平台</p>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')
          }
        >
          <span className={styles.navIcon}>🏠</span>
          项目首页
        </NavLink>

        <div className={styles.projectScope}>
          <p className={styles.navSection}>项目空间</p>
          <label className={styles.switcher}>
            <span>切换项目</span>
            <select
              value={activeProjectId || projects[0]?.id || ''}
              onChange={handleProjectSwitch}
              disabled={projects.length === 0}
            >
              {projects.length === 0 && <option value="">暂无项目</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          {activeProject && (
            <div className={styles.projectTree}>
              <NavLink
                to={`/project/${activeProject.id}`}
                className={({ isActive }) =>
                  [styles.navItem, styles.projectRoot, isActive ? styles.navItemActive : '']
                    .filter(Boolean)
                    .join(' ')
                }
                end
              >
                <span className={styles.navIcon}>📌</span>
                {activeProject.name}
              </NavLink>

              {moduleItems.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [styles.navItem, styles.projectChild, isActive ? styles.navItemActive : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  <span className={styles.navIcon}>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <button type="button" className={styles.resetButton} onClick={handleResetEntry}>
        退出到入口页
      </button>
    </aside>
  )
}
