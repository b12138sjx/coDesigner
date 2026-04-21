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
  accessRole: 'owner',
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
    accessRole: project?.accessRole === 'editor' ? 'editor' : 'owner',
  }
}

function normalizeMember(member) {
  return {
    id: member?.id || '',
    username: member?.username || '',
    displayName: member?.displayName || '',
    isOwner: Boolean(member?.isOwner),
  }
}

function normalizeProjectDetail(project, fallbackProject = null) {
  const base = normalizeProject(project || fallbackProject || {}, Date.now())
  return {
    ...base,
    members: Array.isArray(project?.members) ? project.members.map(normalizeMember) : [],
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

function mergeProjectCollections(projects, nextProject) {
  const normalized = normalizeProject(nextProject)
  const exists = projects.some((project) => project.id === normalized.id)
  const nextProjects = exists
    ? projects.map((project) => (project.id === normalized.id ? { ...project, ...normalized } : project))
    : [normalized, ...projects]

  return sortProjects(nextProjects)
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
      projectDetails: {},
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
      getProjectDetailById: (id) => {
        const state = useProjectStore.getState()
        return state.projectDetails[id] || null
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
            projectDetails: {},
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
          projectDetails: {},
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

          if (missingProjects.length > 0) {
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
            projectDetails: {},
            projectsReady: true,
            projectsLoading: false,
            projectsError: message,
          })
          return { ok: false, error: message }
        }
      },
      loadProjectDetail: async (id) => {
        if (!id) return null

        const session = useSessionStore.getState()
        const project = get().getProjectById(id)

        if (session.authMode !== 'user' || !session.accessToken) {
          const localDetail = normalizeProjectDetail(project || { id })
          set((state) => ({
            projectDetails: {
              ...state.projectDetails,
              [id]: localDetail,
            },
          }))
          return localDetail
        }

        const response = await projectApi.get(id, session.accessToken)
        const detail = normalizeProjectDetail(response?.project, project)

        set((state) => {
          const remoteProjects = state.remoteProjects.some((item) => item.id === id)
            ? mergeProjectCollections(state.remoteProjects, detail)
            : state.remoteProjects

          return {
            remoteProjects,
            projects: state.mode === 'remote' ? remoteProjects : state.projects,
            projectDetails: {
              ...state.projectDetails,
              [id]: detail,
            },
          }
        })

        return detail
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

            const nextDetail = state.projectDetails[id]
              ? {
                  ...state.projectDetails[id],
                  ...normalizeProjectDetail(response?.project, state.projectDetails[id]),
                }
              : state.projectDetails[id]

            return {
              remoteProjects,
              projects: state.mode === 'remote' ? remoteProjects : state.projects,
              projectDetails: nextDetail
                ? {
                    ...state.projectDetails,
                    [id]: nextDetail,
                  }
                : state.projectDetails,
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

          const nextProject = localProjects.find((project) => project.id === id) || null

          return {
            localProjects,
            projects: state.mode === 'local' ? localProjects : state.projects,
            projectDetails: nextProject
              ? {
                  ...state.projectDetails,
                  [id]: normalizeProjectDetail({
                    ...(state.projectDetails[id] || nextProject),
                    ...nextProject,
                  }),
                }
              : state.projectDetails,
          }
        })

        return get().getProjectById(id)
      },
      addProjectMember: async (projectId, username) => {
        const session = useSessionStore.getState()
        if (session.authMode !== 'user' || !session.accessToken) {
          throw new Error('当前模式不支持协作者管理。')
        }

        await projectApi.addMember(
          projectId,
          {
            username: username.trim(),
          },
          session.accessToken
        )

        return get().loadProjectDetail(projectId)
      },
      removeProjectMember: async (projectId, userId) => {
        const session = useSessionStore.getState()
        if (session.authMode !== 'user' || !session.accessToken) {
          throw new Error('当前模式不支持协作者管理。')
        }

        await projectApi.removeMember(projectId, userId, session.accessToken)
        return get().loadProjectDetail(projectId)
      },
      removeProject: async (id) => {
        const session = useSessionStore.getState()

        if (session.authMode === 'user' && session.accessToken) {
          await projectApi.remove(id, session.accessToken)
          set((state) => {
            const remoteProjects = sortProjects(
              state.remoteProjects.filter((project) => project.id !== id)
            )
            const nextDetails = { ...state.projectDetails }
            delete nextDetails[id]

            return {
              remoteProjects,
              projects: state.mode === 'remote' ? remoteProjects : state.projects,
              currentProjectId:
                state.currentProjectId === id
                  ? pickCurrentProjectId(null, remoteProjects)
                  : state.currentProjectId,
              projectDetails: nextDetails,
            }
          })
          return
        }

        set((state) => {
          const localProjects = sortProjects(
            state.localProjects.filter((project) => project.id !== id)
          )
          const nextDetails = { ...state.projectDetails }
          delete nextDetails[id]

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
            projectDetails: nextDetails,
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
          projectDetails: {},
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
