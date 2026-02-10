import { create } from 'zustand'

export const useDocumentStore = create((set) => ({
  documents: {},
  activeDocId: null,
  setActiveDoc: (id) => set({ activeDocId: id }),
  getDocByProject: (projectId) => {
    const state = useDocumentStore.getState()
    return state.documents[projectId] || { prd: '', designNotes: '' }
  },
  setDocByProject: (projectId, doc) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [projectId]: { ...(state.documents[projectId] || {}), ...doc },
      },
    })),
}))
