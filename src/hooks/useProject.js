import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'

export function useProject() {
  const navigate = useNavigate()
  const { currentProjectId, projects, setCurrentProject, addProject } = useProjectStore()

  const openDesign = useCallback(
    (projectId) => {
      setCurrentProject(projectId)
      navigate(projectId ? `/design/${projectId}` : '/design')
    },
    [navigate, setCurrentProject]
  )

  return {
    currentProjectId,
    projects,
    setCurrentProject,
    addProject,
    openDesign,
  }
}
