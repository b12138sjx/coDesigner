import { create } from 'zustand'

export const useProjectStore = create((set) => ({
  currentProjectId: null,
  projects: [
    { id: 'default', name: '默认项目', updatedAt: Date.now() },
  ],
  setCurrentProject: (id) => set({ currentProjectId: id }),
  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, { ...project, id: `p_${Date.now()}`, updatedAt: Date.now() }],
    })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    })),
}))
