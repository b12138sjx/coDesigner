import { create } from 'zustand'

/**
 * 画布状态：选中的工具、画布配置、历史栈（为撤销/重做预留）
 */
export const useCanvasStore = create((set, get) => ({
  tool: 'select',
  zoom: 1,
  showGrid: true,
  showRulers: true,
  // 撤销/重做：后续可接入 tldraw 或命令模式
  historyStack: [],
  historyIndex: -1,
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowRulers: (showRulers) => set({ showRulers }),
  pushHistory: (snapshot) => {
    const { historyStack, historyIndex } = get()
    const newStack = historyStack.slice(0, historyIndex + 1).concat(snapshot)
    set({ historyStack: newStack.slice(-50), historyIndex: newStack.length - 1 })
  },
  undo: () => {
    const { historyStack, historyIndex } = get()
    if (historyIndex <= 0) return
    set({ historyIndex: historyIndex - 1 })
    return historyStack[historyIndex - 1]
  },
  redo: () => {
    const { historyStack, historyIndex } = get()
    if (historyIndex >= historyStack.length - 1) return
    set({ historyIndex: historyIndex + 1 })
    return historyStack[historyIndex + 1]
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().historyStack.length - 1 && get().historyStack.length > 0,
}))
