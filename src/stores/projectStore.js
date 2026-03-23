import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useCanvasSnapshotStore } from '@/stores/canvasSnapshotStore'
import { useSessionStore } from '@/stores/sessionStore'
import { SAMPLE_PROJECT } from '@/utils/mockData'
import { projectApi } from '@/utils/projectApi'

const defaultProject = {
  id: 'default',
  name: 'Default Project',
  brief: 'Shared local workspace for design, documents, and APIs.',
  updatedAt: Date.now(),
}

const baseProjects = [SAMPLE_PROJECT, defaultProject]
const nonSyncProjectIds = new Set(baseProjects.map((project) => project.id))


function normalizeTimestamp(value, fallback = Date.now()) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeProject(project, fallbackUpdatedAt = Date.now()) {
  return {
    id: project?.id || `p_${Date.now()}`,
    name: project?.name?.trim() || 'Untitled Project',
    brief: project?.brief || '',
    createdAt: normalizeTimestamp(project?.createdAt, fallbackUpdatedAt),
    updatedAt: normalizeTimestamp(project?.updatedAt, fallbackUpdatedAt),
  }
}

function mergeBaseProjects(projects) {
  const mergedProjects = Array.isArray(projects) ? projects.map((item) => normalizeProject(item)) : []

  for (const baseProject of baseProjects) {
    const exists = mergedProjects.some((project) => project.id === baseProject.id)
    if (!exists) {
      mergedProjects.push(normalizeProject(baseProject))
    }
  }

  return mergedProjects
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
}

function pickCurrentProjectId(preferredId, projects) {
  if (preferredId && projects.some((project) => project.id === preferredId)) {
    return preferredId
  }
  return projects[0]?.id ?? null
}

function toErrorMessage(error, fallback) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function buildImportPayload(localProjects, localSnapshotsByProject) {
  return {
    projects: localProjects
      .filter((project) => !nonSyncProjectIds.has(project.id))
      .map((project) => {
        const snapshotEntry = localSnapshotsByProject[project.id]
        return {
          id: project.id,
          name: project.name,
          brief: project.brief || '',
          updatedAt: new Date(project.updatedAt || Date.now()).toISOString(),
          canvas: snapshotEntry?.snapshot
            ? {
                snapshot: snapshotEntry.snapshot,
                snapshotSchemaVersion: snapshotEntry.version || 1,
                updatedAt: snapshotEntry.updatedAt
                  ? new Date(snapshotEntry.updatedAt).toISOString()
                  : new Date().toISOString(),
              }
            : undefined,
        }
      }),
  }
}


export const useProjectStore = create(
  persist(
    (set, get) => ({
      mode: 'local',
      projects: sortProjects(mergeBaseProjects(baseProjects)),
      currentProjectId: SAMPLE_PROJECT.id,
      localProjects: sortProjects(mergeBaseProjects(baseProjects)),
      localCurrentProjectId: SAMPLE_PROJECT.id,
      remoteProjects: [],
      projectsReady: true,
      projectsLoading: false,
      projectsError: '',
      importedUserIds: {},
      setCurrentProject: (id) =>
        set((state) => ({
          currentProjectId: id,
          localCurrentProjectId: state.mode === 'local' ? id : state.localCurrentProjectId,
        })),
      getProjectById: (id) => {
        const state = useProjectStore.getState()
        return state.projects.find((project) => project.id === id) || null
      },
      syncWithSession: async () => {
        const session = useSessionStore.getState()
        const canvasSnapshotStore = useCanvasSnapshotStore.getState()

        if (session.authMode !== 'user' || !session.accessToken || !session.user?.id) {
          const localProjects = sortProjects(get().localProjects)
          const currentProjectId = pickCurrentProjectId(get().localCurrentProjectId, localProjects)

          canvasSnapshotStore.clearRemoteSnapshots()
          canvasSnapshotStore.setMode('local')

          set({
            mode: 'local',
            projects: localProjects,
            currentProjectId,
            remoteProjects: [],
            projectsReady: true,
            projectsLoading: false,
            projectsError: '',
          })

          return { ok: true, mode: 'local' }
        }

        set({
          mode: 'remote',
          projectsLoading: true,
          projectsReady: false,
          projectsError: '',
        })

        canvasSnapshotStore.clearRemoteSnapshots()
        canvasSnapshotStore.setMode('remote')

        try {
          let response = await projectApi.list(session.accessToken)
          const importPayload = buildImportPayload(
            get().localProjects,
            canvasSnapshotStore.localSnapshotsByProject
          )
          const remoteProjectIds = new Set(
            Array.isArray(response?.projects) ? response.projects.map((project) => project.id) : []
          )
          const missingProjects = importPayload.projects.filter(
            (project) => !remoteProjectIds.has(project.id)
          )
          const shouldImport = missingProjects.length > 0

          if (shouldImport) {
            await projectApi.importLocal({ projects: missingProjects }, session.accessToken)
            set((state) => ({
              importedUserIds: {
                ...state.importedUserIds,
                [session.user.id]: true,
              },
            }))
            response = await projectApi.list(session.accessToken)
          }


          const remoteProjects = sortProjects(
            Array.isArray(response?.projects)
              ? response.projects.map((item) => normalizeProject(item))
              : []
          )
          const nextCurrentProjectId =
            pickCurrentProjectId(get().currentProjectId, remoteProjects) ||
            pickCurrentProjectId(get().localCurrentProjectId, remoteProjects)

          set({
            mode: 'remote',
            remoteProjects,
            projects: remoteProjects,
            currentProjectId: nextCurrentProjectId,
            projectsReady: true,
            projectsLoading: false,
            projectsError: '',
          })

          return { ok: true, mode: 'remote' }
        } catch (error) {
          const message = toErrorMessage(error, 'Failed to load remote projects.')
          set({
            mode: 'remote',
            remoteProjects: [],
            projects: [],
            currentProjectId: null,
            projectsReady: true,
            projectsLoading: false,
            projectsError: message,
          })
          return { ok: false, error: message }
        }
      },
      createProject: async (name) => {
        const session = useSessionStore.getState()
        const trimmedName = name?.trim() || ''

        if (session.authMode === 'user' && session.accessToken) {
          const response = await projectApi.create(
            {
              name: trimmedName || `New Project ${get().projects.length + 1}`,
            },
            session.accessToken
          )
          const project = normalizeProject(response?.project)

          set((state) => {
            const remoteProjects = sortProjects([project, ...state.remoteProjects])
            return {
              remoteProjects,
              projects: state.mode === 'remote' ? remoteProjects : state.projects,
              currentProjectId: project.id,
            }
          })

          return project.id
        }

        const project = normalizeProject({
          id: `p_${Date.now()}`,
          name: trimmedName || `New Project ${get().localProjects.length + 1}`,
          brief: '',
          updatedAt: Date.now(),
        })

        set((state) => {
          const localProjects = sortProjects([project, ...state.localProjects])
          return {
            localProjects,
            localCurrentProjectId: project.id,
            projects: state.mode === 'local' ? localProjects : state.projects,
            currentProjectId: project.id,
          }
        })

        return project.id
      },
      addProject: async (project) => {
        return get().createProject(project?.name || '')
      },
      updateProject: async (id, updates) => {
        const session = useSessionStore.getState()

        if (session.authMode === 'user' && session.accessToken) {
          const response = await projectApi.update(
            id,
            {
              ...(updates?.name !== undefined ? { name: updates.name } : {}),
              ...(updates?.brief !== undefined ? { brief: updates.brief } : {}),
            },
            session.accessToken
          )
          const nextProject = normalizeProject(response?.project)

          set((state) => {
            const remoteProjects = sortProjects(
              state.remoteProjects.map((project) => (project.id === id ? nextProject : project))
            )
            return {
              remoteProjects,
              projects: state.mode === 'remote' ? remoteProjects : state.projects,
            }
          })

          return nextProject
        }

        set((state) => {
          const localProjects = sortProjects(
            state.localProjects.map((project) =>
              project.id === id
                ? normalizeProject({
                    ...project,
                    ...updates,
                    updatedAt: Date.now(),
                  })
                : project
            )
          )
          return {
            localProjects,
            projects: state.mode === 'local' ? localProjects : state.projects,
          }
        })

        return get().getProjectById(id)
      },
      removeProject: async (id) => {
        const session = useSessionStore.getState()

        if (session.authMode === 'user' && session.accessToken) {
          await projectApi.remove(id, session.accessToken)
          set((state) => {
            const remoteProjects = sortProjects(
              state.remoteProjects.filter((project) => project.id !== id)
            )
            return {
              remoteProjects,
              projects: state.mode === 'remote' ? remoteProjects : state.projects,
              currentProjectId:
                state.currentProjectId === id
                  ? pickCurrentProjectId(null, remoteProjects)
                  : state.currentProjectId,
            }
          })
          return
        }

        set((state) => {
          const localProjects = sortProjects(
            state.localProjects.filter((project) => project.id !== id)
          )
          return {
            localProjects,
            projects: state.mode === 'local' ? localProjects : state.projects,
            currentProjectId:
              state.currentProjectId === id
                ? pickCurrentProjectId(state.localCurrentProjectId, localProjects)
                : state.currentProjectId,
            localCurrentProjectId:
              state.localCurrentProjectId === id
                ? pickCurrentProjectId(null, localProjects)
                : state.localCurrentProjectId,
          }
        })
      },
    }),
    {
      name: 'codesigner-projects',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        const localProjects = sortProjects(
          mergeBaseProjects(persisted.localProjects || currentState.localProjects)
        )
        const localCurrentProjectId = pickCurrentProjectId(
          persisted.localCurrentProjectId || currentState.localCurrentProjectId,
          localProjects
        )

        return {
          ...currentState,
          ...persisted,
          localProjects,
          localCurrentProjectId,
          projects: localProjects,
          currentProjectId: localCurrentProjectId,
          remoteProjects: [],
          mode: 'local',
          projectsReady: true,
          projectsLoading: false,
          projectsError: '',
        }
      },
      partialize: (state) => ({
        localProjects: state.localProjects,
        localCurrentProjectId: state.localCurrentProjectId,
        importedUserIds: state.importedUserIds,
      }),
    }
  )
)
