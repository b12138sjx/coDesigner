import { useCallback } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'

export function useCanvasHistory() {
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const canUndo = useCanvasStore((s) => s.canUndo())
  const canRedo = useCanvasStore((s) => s.canRedo())
  const pushHistory = useCanvasStore((s) => s.pushHistory)

  const handleUndo = useCallback(() => {
    const snapshot = undo()
    if (snapshot) {
      // 将 snapshot 应用回画布（需与 tldraw 或 konva 集成）
    }
  }, [undo])

  const handleRedo = useCallback(() => {
    const snapshot = redo()
    if (snapshot) {
      // 将 snapshot 应用回画布
    }
  }, [redo])

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    pushHistory,
  }
}
