import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const SNAPSHOT_SCHEMA_VERSION = 1

export const useCanvasSnapshotStore = create(
  persist(
    (set) => ({
      snapshotsByProject: {},
      saveSnapshot: (projectId, snapshot) => {
        if (!projectId || !snapshot) return
        set((state) => ({
          snapshotsByProject: {
            ...state.snapshotsByProject,
            [projectId]: {
              version: SNAPSHOT_SCHEMA_VERSION,
              projectId,
              updatedAt: Date.now(),
              snapshot,
            },
          },
        }))
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
        }
      },
      removeSnapshot: (projectId) =>
        set((state) => {
          if (!projectId) return state
          const next = { ...state.snapshotsByProject }
          delete next[projectId]
          return { snapshotsByProject: next }
        }),
      clearSnapshots: () => set({ snapshotsByProject: {} }),
    }),
    {
      name: 'codesigner-canvas-snapshots',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        snapshotsByProject: state.snapshotsByProject,
      }),
    }
  )
)
