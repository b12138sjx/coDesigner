import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'

export function useProject() {
  const navigate = useNavigate()
  const { currentProjectId, projects, setCurrentProject, createProject, addProject } =
    useProjectStore()

  const openProject = useCallback(
    (projectId) => {
      const targetId = projectId || currentProjectId
      if (!targetId) {
        navigate('/projects')
        return
      }
      setCurrentProject(targetId)
      navigate(`/project/${targetId}`)
    },
    [currentProjectId, navigate, setCurrentProject]
  )

  const openDesign = useCallback(
    (projectId) => {
      const targetId = projectId || currentProjectId
      if (!targetId) {
        navigate('/projects')
        return
      }
      setCurrentProject(targetId)
      navigate(`/design/${targetId}`)
    },
    [currentProjectId, navigate, setCurrentProject]
  )

  return {
    currentProjectId,
    projects,
    setCurrentProject,
    createProject,
    addProject,
    openProject,
    openDesign,
  }
}
