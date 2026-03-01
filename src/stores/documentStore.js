import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SAMPLE_DOCUMENT, SAMPLE_PROJECT_ID } from '@/utils/mockData'

/**
 * 单个评论/注释：id, 内容, 可选引用原文, 位置(行号), 创建时间
 */
export function createComment({
  text,
  quote = '',
  lineStart = null,
  anchorOffset = null,
}) {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    text: text || '',
    quote: quote || '',
    lineStart,
    anchorOffset,
    createdAt: Date.now(),
    resolved: false,
  }
}

export const useDocumentStore = create(
  persist(
    (set) => ({
      documents: { [SAMPLE_PROJECT_ID]: SAMPLE_DOCUMENT },
      activeDocId: null,
      setActiveDoc: (id) => set({ activeDocId: id }),
      getDocByProject: (projectId) => {
        const state = useDocumentStore.getState()
        const doc = state.documents[projectId]
        return doc || { content: '', comments: [] }
      },
      setDocByProject: (projectId, doc) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [projectId]: { ...(state.documents[projectId] || {}), ...doc },
          },
        })),
      setContent: (projectId, content) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [projectId]: {
              ...(state.documents[projectId] || { content: '', comments: [] }),
              content,
            },
          },
        })),
      addComment: (projectId, comment) =>
        set((state) => {
          const current = state.documents[projectId] || { content: '', comments: [] }
          return {
            documents: {
              ...state.documents,
              [projectId]: {
                ...current,
                comments: [...(current.comments || []), comment],
              },
            },
          }
        }),
      removeComment: (projectId, commentId) =>
        set((state) => {
          const current = state.documents[projectId]
          if (!current?.comments) return state
          return {
            documents: {
              ...state.documents,
              [projectId]: {
                ...current,
                comments: current.comments.filter((c) => c.id !== commentId),
              },
            },
          }
        }),
      toggleCommentResolved: (projectId, commentId) =>
        set((state) => {
          const current = state.documents[projectId]
          if (!current?.comments) return state
          return {
            documents: {
              ...state.documents,
              [projectId]: {
                ...current,
                comments: current.comments.map((c) =>
                  c.id === commentId ? { ...c, resolved: !c.resolved } : c
                ),
              },
            },
          }
        }),
    }),
    {
      name: 'codesigner-documents',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        const persistedDocs = persisted.documents || {}
        return {
          ...currentState,
          ...persisted,
          documents: {
            [SAMPLE_PROJECT_ID]: SAMPLE_DOCUMENT,
            ...persistedDocs,
          },
        }
      },
      partialize: (state) => ({
        documents: state.documents,
        activeDocId: state.activeDocId,
      }),
    }
  )
)
