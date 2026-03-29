import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import styles from './AppSidebar.module.css'

function resolveProjectIdFromPath(pathname) {
  const match = pathname.match(/^\/(?:project|design|documents|api)\/([^/]+)/)
  return match?.[1] || null
}

function resolveProjectPath(pathname, projectId) {
  if (!projectId) return '/projects'
  const match = pathname.match(/^\/(project|design|documents|api)\//)
  const scope = match?.[1] || 'project'
  return `/${scope}/${projectId}`
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const currentProjectId = useProjectStore((state) => state.currentProjectId)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const getProjectById = useProjectStore((state) => state.getProjectById)
  const authMode = useSessionStore((state) => state.authMode)
  const user = useSessionStore((state) => state.user)
  const authLoading = useSessionStore((state) => state.authLoading)
  const logout = useSessionStore((state) => state.logout)
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)

  const inProjectContext = /^\/(?:project|design|documents|api)\//.test(location.pathname)
  const routeProjectId = resolveProjectIdFromPath(location.pathname)
  const activeProjectId = routeProjectId || (inProjectContext ? currentProjectId : null)
  const activeProject = activeProjectId ? getProjectById(activeProjectId) : null
  const userName = user?.name || user?.username || '未登录'
  const userInitial = userName.slice(0, 1)

  const moduleItems = activeProjectId
    ? [
        { to: `/design/${activeProjectId}`, label: '画布设计', icon: '✏️' },
        { to: `/documents/${activeProjectId}`, label: '智能文档', icon: '📄' },
        { to: `/api/${activeProjectId}`, label: '接口协同', icon: '🔌' },
      ]
    : []

  const handleResetEntry = async () => {
    await logout()
    navigate('/entry', { replace: true })
  }

  const handleProjectSwitch = (event) => {
    const nextProjectId = event.target.value
    if (!nextProjectId) return
    setCurrentProject(nextProjectId)
    navigate(resolveProjectPath(location.pathname, nextProjectId))
  }

  return (
    <aside className={[styles.sidebar, collapsed ? styles.sidebarCollapsed : ''].filter(Boolean).join(' ')}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>Co</span>
        {!collapsed && (
          <div className={styles.logoText}>
            <strong>Designer</strong>
            <span>Collaborative Workspace</span>
          </div>
        )}
        <button
          type="button"
          className={styles.sidebarCollapseBtn}
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? '展开侧栏' : '折叠侧栏'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className={styles.userPanel}>
        <span className={styles.userAvatar}>{userInitial}</span>
        {!collapsed && (
          <div className={styles.userMeta}>
            <p>{authMode === 'guest' ? '访客模式' : authMode === 'user' ? '账号模式' : '未登录'}</p>
            <strong>{userName}</strong>
          </div>
        )}
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
        {!collapsed && <p className={styles.navSection}>平台</p>}
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')
          }
          title="项目首页"
        >
          <span className={styles.navIcon}>🏠</span>
          {!collapsed && '项目首页'}
        </NavLink>

        <div className={styles.projectScope}>
          {!collapsed && <p className={styles.navSection}>项目空间</p>}
          {!collapsed && (
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
          )}

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
                title={activeProject.name}
              >
                <span className={styles.navIcon}>📌</span>
                {!collapsed && activeProject.name}
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
                  title={label}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <button
        type="button"
        className={styles.resetButton}
        onClick={handleResetEntry}
        disabled={authLoading}
      >
        {collapsed
          ? '⎋'
          : authLoading
            ? '退出中...'
            : authMode === 'user'
              ? '退出登录'
              : '返回入口页'}
      </button>
    </aside>
  )
}
