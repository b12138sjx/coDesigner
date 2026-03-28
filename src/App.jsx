import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { EntryPage } from './pages/EntryPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectOverviewPage } from './pages/ProjectOverviewPage'
import { DesignPage } from './pages/DesignPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ApiPage } from './pages/ApiPage'
import { useProjectStore } from './stores/projectStore'
import { useSessionStore } from './stores/sessionStore'
import { useUiStore } from './stores/uiStore'
import styles from './App.module.css'

function LoadingScreen({
  title = '正在恢复会话',
  description = '稍等一下，我们正在同步当前登录状态。',
}) {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingCard}>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}

function EntryRedirect() {
  const authReady = useSessionStore((state) => state.authReady)
  const hasEntered = useSessionStore((state) => state.hasEntered)

  if (!authReady) return <LoadingScreen />
  return <Navigate to={hasEntered ? '/projects' : '/entry'} replace />
}

function RequireEntryLayout() {
  const location = useLocation()
  const authReady = useSessionStore((state) => state.authReady)
  const hasEntered = useSessionStore((state) => state.hasEntered)

  if (!authReady) return <LoadingScreen />
  if (!hasEntered) return <Navigate to="/entry" replace state={{ from: location }} />
  return <MainLayout />
}

function ProjectRouteGuard({ children }) {
  const { projectId } = useParams()
  const location = useLocation()
  const authReady = useSessionStore((state) => state.authReady)
  const authMode = useSessionStore((state) => state.authMode)
  const projectMode = useProjectStore((state) => state.mode)
  const projectsReady = useProjectStore((state) => state.projectsReady)
  const projectsLoading = useProjectStore((state) => state.projectsLoading)
  const hasProject = useProjectStore((state) =>
    state.projects.some((project) => project.id === projectId)
  )
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const waitingRemoteProjects = authMode === 'user' && projectMode !== 'remote'

  useEffect(() => {
    if (projectId && hasProject) {
      setCurrentProject(projectId)
    }
  }, [hasProject, projectId, setCurrentProject])

  if (!authReady || projectsLoading || !projectsReady || waitingRemoteProjects) {
    return (
      <LoadingScreen
        title="正在同步项目"
        description="稍等一下，我们正在校验当前账号可访问的项目。"
      />
    )
  }

  if (!projectId || !hasProject) {
    return <Navigate to="/projects" replace state={{ from: location }} />
  }
  return children
}

function App() {
  const theme = useUiStore((state) => state.theme)
  const initializeAuth = useSessionStore((state) => state.initializeAuth)
  const authReady = useSessionStore((state) => state.authReady)
  const authMode = useSessionStore((state) => state.authMode)
  const userId = useSessionStore((state) => state.user?.id || '')
  const syncWithSession = useProjectStore((state) => state.syncWithSession)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (!authReady) return
    void syncWithSession()
  }, [authMode, authReady, syncWithSession, userId])

  return (
    <Routes>
      <Route path="/" element={<EntryRedirect />} />
      <Route path="/entry" element={<EntryPage />} />

      <Route element={<RequireEntryLayout />}>
        <Route path="projects" element={<ProjectsPage />} />
        <Route
          path="project/:projectId"
          element={
            <ProjectRouteGuard>
              <ProjectOverviewPage />
            </ProjectRouteGuard>
          }
        />
        <Route
          path="design/:projectId"
          element={
            <ProjectRouteGuard>
              <DesignPage />
            </ProjectRouteGuard>
          }
        />
        <Route
          path="documents/:projectId"
          element={
            <ProjectRouteGuard>
              <DocumentsPage />
            </ProjectRouteGuard>
          }
        />
        <Route
          path="api/:projectId"
          element={
            <ProjectRouteGuard>
              <ApiPage />
            </ProjectRouteGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
