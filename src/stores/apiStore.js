import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SAMPLE_APIS, SAMPLE_PROJECT_ID } from '@/utils/mockData'

export const useApiStore = create(
  persist(
    (set) => ({
      apisByProject: {
        [SAMPLE_PROJECT_ID]: SAMPLE_APIS,
      },
      setApis: (projectId, apis) =>
        set((state) => ({
          apisByProject: { ...state.apisByProject, [projectId]: apis },
        })),
      addApi: (projectId, api) =>
        set((state) => ({
          apisByProject: {
            ...state.apisByProject,
            [projectId]: [...(state.apisByProject[projectId] || []), api],
          },
        })),
      updateApi: (projectId, apiId, updates) =>
        set((state) => ({
          apisByProject: {
            ...state.apisByProject,
            [projectId]: (state.apisByProject[projectId] || []).map((api) =>
              api.id === apiId ? { ...api, ...updates } : api
            ),
          },
        })),
      removeApi: (projectId, apiId) =>
        set((state) => ({
          apisByProject: {
            ...state.apisByProject,
            [projectId]: (state.apisByProject[projectId] || []).filter((api) => api.id !== apiId),
          },
        })),
      addApiNote: (projectId, apiId, note) =>
        set((state) => ({
          apisByProject: {
            ...state.apisByProject,
            [projectId]: (state.apisByProject[projectId] || []).map((api) =>
              api.id === apiId
                ? { ...api, notes: [...(api.notes || []), note] }
                : api
            ),
          },
        })),
      getApis: (projectId) => useApiStore.getState().apisByProject[projectId] || [],
    }),
    {
      name: 'codesigner-apis',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        return {
          ...currentState,
          ...persisted,
          apisByProject: {
            [SAMPLE_PROJECT_ID]: SAMPLE_APIS,
            ...(persisted.apisByProject || {}),
          },
        }
      },
      partialize: (state) => ({
        apisByProject: state.apisByProject,
      }),
    }
  )
)
