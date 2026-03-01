import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SAMPLE_PROJECT } from '@/utils/mockData'

const defaultProject = { id: 'default', name: '默认项目', updatedAt: Date.now() }
const baseProjects = [SAMPLE_PROJECT, defaultProject]

export const useProjectStore = create(
  persist(
    (set) => ({
      currentProjectId: SAMPLE_PROJECT.id,
      projects: baseProjects,
      setCurrentProject: (id) => set({ currentProjectId: id }),
      getProjectById: (id) => {
        const state = useProjectStore.getState()
        return state.projects.find((project) => project.id === id) || null
      },
      createProject: (name) => {
        const id = `p_${Date.now()}`
        const state = useProjectStore.getState()
        const project = {
          id,
          name: name?.trim() || `新项目 ${state.projects.length + 1}`,
          updatedAt: Date.now(),
        }
        set((current) => ({
          projects: [project, ...current.projects],
        }))
        return id
      },
      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects,
            { ...project, id: `p_${Date.now()}`, updatedAt: Date.now() },
          ],
        })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        })),
      removeProject: (id) =>
        set((state) => {
          const nextProjects = state.projects.filter((project) => project.id !== id)
          return {
            projects: nextProjects,
            currentProjectId:
              state.currentProjectId === id ? (nextProjects[0]?.id ?? null) : state.currentProjectId,
          }
        }),
    }),
    {
      name: 'codesigner-projects',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        const persistedProjects = Array.isArray(persisted.projects) ? persisted.projects : []
        const mergedProjects = [...persistedProjects]

        for (const baseProject of baseProjects) {
          const exists = mergedProjects.some((project) => project.id === baseProject.id)
          if (!exists) mergedProjects.push(baseProject)
        }

        const currentProjectId = persisted.currentProjectId || currentState.currentProjectId
        const hasCurrent = mergedProjects.some((project) => project.id === currentProjectId)

        return {
          ...currentState,
          ...persisted,
          projects: mergedProjects,
          currentProjectId: hasCurrent ? currentProjectId : SAMPLE_PROJECT.id,
        }
      },
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        projects: state.projects,
      }),
    }
  )
)
