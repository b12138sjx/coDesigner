import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

function createWelcomeMessage() {
  return {
    id: 'ai_welcome',
    role: 'assistant',
    content: '我是你的文档 AI 助手。可以直接自由提问，也可以选中文本后让我润色、扩写、总结或解释。',
    status: 'done',
    source: 'system',
    createdAt: Date.now(),
  }
}

export function createAiMessage({
  role,
  content,
  status = 'done',
  source = 'chat',
}) {
  return {
    id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    role,
    content: content || '',
    status,
    source,
    createdAt: Date.now(),
  }
}

export function createEmptyAiSession() {
  return {
    isOpen: false,
    draft: '',
    messages: [createWelcomeMessage()],
    requestStatus: 'idle',
    error: '',
    lastSelection: null,
    resultPreview: null,
  }
}

function normalizeSession(session = {}) {
  const base = createEmptyAiSession()
  const messages = Array.isArray(session.messages) && session.messages.length > 0
    ? session.messages
    : base.messages
  const requestStatus = session.requestStatus === 'pending' ? 'idle' : session.requestStatus

  return {
    ...base,
    ...session,
    messages,
    requestStatus: requestStatus || 'idle',
    error: requestStatus === 'pending' ? '' : (session.error || ''),
  }
}

export const useDocumentAiStore = create(
  persist(
    (set) => ({
      sessions: {},
      ensureSession: (projectId) =>
        set((state) => {
          if (!projectId || state.sessions[projectId]) return state
          return {
            sessions: {
              ...state.sessions,
              [projectId]: createEmptyAiSession(),
            },
          }
        }),
      getSession: (projectId) => {
        const session = useDocumentAiStore.getState().sessions[projectId]
        return normalizeSession(session)
      },
      setPanelOpen: (projectId, isOpen) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: {
              ...normalizeSession(state.sessions[projectId]),
              isOpen: Boolean(isOpen),
            },
          },
        })),
      setDraft: (projectId, draft) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: {
              ...normalizeSession(state.sessions[projectId]),
              draft,
            },
          },
        })),
      pushMessage: (projectId, message) =>
        set((state) => {
          const session = normalizeSession(state.sessions[projectId])
          return {
            sessions: {
              ...state.sessions,
              [projectId]: {
                ...session,
                messages: [...session.messages, message],
              },
            },
          }
        }),
      setRequestState: (projectId, requestStatus, error = '') =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: {
              ...normalizeSession(state.sessions[projectId]),
              requestStatus,
              error,
            },
          },
        })),
      setSelectionContext: (projectId, selection) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: {
              ...normalizeSession(state.sessions[projectId]),
              lastSelection: selection || null,
            },
          },
        })),
      setResultPreview: (projectId, resultPreview) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: {
              ...normalizeSession(state.sessions[projectId]),
              resultPreview,
            },
          },
        })),
      resetSession: (projectId) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [projectId]: createEmptyAiSession(),
          },
        })),
    }),
    {
      name: 'codesigner-document-ai',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {}
        const normalizedSessions = Object.fromEntries(
          Object.entries(persisted.sessions || {}).map(([projectId, session]) => [
            projectId,
            normalizeSession(session),
          ])
        )

        return {
          ...currentState,
          ...persisted,
          sessions: normalizedSessions,
        }
      },
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    }
  )
)
