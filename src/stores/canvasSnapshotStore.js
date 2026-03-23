import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const SNAPSHOT_SCHEMA_VERSION = 1

function buildSnapshotEntry(projectId, snapshot, extra = {}) {
  return {
    version: extra.version ?? SNAPSHOT_SCHEMA_VERSION,
    projectId,
    updatedAt: extra.updatedAt ?? Date.now(),
    snapshot: snapshot ?? null,
    revision: extra.revision ?? 0,
  }
}

export const useCanvasSnapshotStore = create(
  persist(
    (set) => ({
      mode: 'local',
      snapshotsByProject: {},
      localSnapshotsByProject: {},
      remoteSnapshotsByProject: {},
      setMode: (mode) =>
        set((state) => ({
          mode: mode === 'remote' ? 'remote' : 'local',
          snapshotsByProject:
            mode === 'remote' ? state.remoteSnapshotsByProject : state.localSnapshotsByProject,
        })),
      saveSnapshot: (projectId, snapshot) => {
        if (!projectId || !snapshot) return

        set((state) => {
          const entry = buildSnapshotEntry(projectId, snapshot)
          const localSnapshotsByProject = {
            ...state.localSnapshotsByProject,
            [projectId]: entry,
          }

          return {
            localSnapshotsByProject,
            snapshotsByProject:
              state.mode === 'local' ? localSnapshotsByProject : state.snapshotsByProject,
          }
        })
      },
      setRemoteSnapshotEntry: (projectId, entry) => {
        if (!projectId) return

        set((state) => {
          const remoteEntry = {
            version: entry?.version ?? null,
            projectId,
            updatedAt: entry?.updatedAt ?? null,
            snapshot: entry?.snapshot ?? null,
            revision: entry?.revision ?? 0,
          }
          const remoteSnapshotsByProject = {
            ...state.remoteSnapshotsByProject,
            [projectId]: remoteEntry,
          }

          return {
            remoteSnapshotsByProject,
            snapshotsByProject:
              state.mode === 'remote' ? remoteSnapshotsByProject : state.snapshotsByProject,
          }
        })
      },
      getSnapshot: (projectId) => {
        if (!projectId) return null
        const entry = useCanvasSnapshotStore.getState().snapshotsByProject[projectId]
        return entry?.snapshot || null
      },
      getSnapshotMeta: (projectId) => {
        if (!projectId) return null
        const entry = useCanvasSnapshotStore.getState().snapshotsByProject[projectId]
        if (!entry) return null
        return {
          version: entry.version,
          projectId: entry.projectId,
          updatedAt: entry.updatedAt,
          revision: entry.revision ?? 0,
        }
      },
      removeSnapshot: (projectId) =>
        set((state) => {
          if (!projectId) return state
          const localSnapshotsByProject = { ...state.localSnapshotsByProject }
          delete localSnapshotsByProject[projectId]

          return {
            localSnapshotsByProject,
            snapshotsByProject:
              state.mode === 'local' ? localSnapshotsByProject : state.snapshotsByProject,
          }
        }),
      clearSnapshots: () =>
        set((state) => ({
          localSnapshotsByProject: {},
          snapshotsByProject: state.mode === 'local' ? {} : state.snapshotsByProject,
        })),
      clearRemoteSnapshots: () =>
        set((state) => ({
          remoteSnapshotsByProject: {},
          snapshotsByProject: state.mode === 'remote' ? {} : state.snapshotsByProject,
        })),
    }),
    {
      name: 'codesigner-canvas-snapshots',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        const localSnapshotsByProject = persisted.localSnapshotsByProject || {}

        return {
          ...currentState,
          ...persisted,
          localSnapshotsByProject,
          snapshotsByProject: localSnapshotsByProject,
          remoteSnapshotsByProject: {},
          mode: 'local',
        }
      },
      partialize: (state) => ({
        localSnapshotsByProject: state.localSnapshotsByProject,
      }),
    }
  )
)
