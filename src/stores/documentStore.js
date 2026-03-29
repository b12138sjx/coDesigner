import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SAMPLE_DOCUMENT, SAMPLE_PROJECT_ID } from '@/utils/mockData'
import { normalizeDocumentRecord } from '@/utils/documentContent'

/**
 * 单个评论/注释：id, 内容, 可选引用原文, 位置(行号), 创建时间
 */
export function createComment({
  text,
  quote = '',
  lineStart = null,
  anchorOffset = null,
  selectionTo = null,
}) {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    text: text || '',
    quote: quote || '',
    lineStart,
    anchorOffset,
    selectionTo,
    createdAt: Date.now(),
    resolved: false,
  }
}

function getEmptyDocument() {
  return normalizeDocumentRecord({ content: '', comments: [] })
}

export const useDocumentStore = create(
  persist(
    (set) => ({
      documents: { [SAMPLE_PROJECT_ID]: normalizeDocumentRecord(SAMPLE_DOCUMENT) },
      activeDocId: null,
      setActiveDoc: (id) => set({ activeDocId: id }),
      getDocByProject: (projectId) => {
        const state = useDocumentStore.getState()
        const doc = state.documents[projectId]
        return normalizeDocumentRecord(doc || getEmptyDocument())
      },
      setDocByProject: (projectId, doc) =>
        set((state) => {
          const current = normalizeDocumentRecord(state.documents[projectId] || getEmptyDocument())
          return {
            documents: {
              ...state.documents,
              [projectId]: normalizeDocumentRecord({ ...current, ...doc }),
            },
          }
        }),
      setContent: (projectId, content, contentFormat = 'html') =>
        set((state) => {
          const current = normalizeDocumentRecord(state.documents[projectId] || getEmptyDocument())
          return {
            documents: {
              ...state.documents,
              [projectId]: normalizeDocumentRecord({
                ...current,
                content,
                contentFormat,
              }),
            },
          }
        }),
      addComment: (projectId, comment) =>
        set((state) => {
          const current = normalizeDocumentRecord(state.documents[projectId] || getEmptyDocument())
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
        const persistedDocs = Object.fromEntries(
          Object.entries(persisted.documents || {}).map(([projectId, doc]) => [
            projectId,
            normalizeDocumentRecord(doc),
          ])
        )
        return {
          ...currentState,
          ...persisted,
          documents: {
            [SAMPLE_PROJECT_ID]: normalizeDocumentRecord(SAMPLE_DOCUMENT),
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
