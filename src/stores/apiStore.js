import { create } from 'zustand'

export const useApiStore = create((set) => ({
  apisByProject: {},
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
  getApis: (projectId) => useApiStore.getState().apisByProject[projectId] || [],
}))
