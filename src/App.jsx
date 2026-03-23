import { useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
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

function AuthLoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingCard}>
        <strong>正在恢复会话</strong>
        <p>稍等一下，我们正在同步当前登录状态。</p>
      </div>
    </div>
  )
}

function EntryRedirect() {
  const authReady = useSessionStore((state) => state.authReady)
  const hasEntered = useSessionStore((state) => state.hasEntered)

  if (!authReady) return <AuthLoadingScreen />
  return <Navigate to={hasEntered ? '/projects' : '/entry'} replace />
}

function RequireEntryLayout() {
  const authReady = useSessionStore((state) => state.authReady)
  const hasEntered = useSessionStore((state) => state.hasEntered)

  if (!authReady) return <AuthLoadingScreen />
  if (!hasEntered) return <Navigate to="/entry" replace />
  return <MainLayout />
}

function ProjectRouteGuard({ children }) {
  const { projectId } = useParams()
  const hasProject = useProjectStore((state) =>
    state.projects.some((project) => project.id === projectId)
  )
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)

  useEffect(() => {
    if (projectId && hasProject) {
      setCurrentProject(projectId)
    }
  }, [hasProject, projectId, setCurrentProject])

  if (!projectId || !hasProject) return <Navigate to="/projects" replace />
  return children
}

function App() {
  const theme = useUiStore((state) => state.theme)
  const initializeAuth = useSessionStore((state) => state.initializeAuth)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

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
