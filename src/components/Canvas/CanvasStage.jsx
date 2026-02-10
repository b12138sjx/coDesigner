import { useCallback } from 'react'
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import styles from './CanvasStage.module.css'

/**
 * 基于 tldraw 的画布：支持绘制、形状、文本、箭头等，为后续多人协同与持久化预留接口
 */
export function CanvasStage({ projectId }) {
  const handleMount = useCallback(
    (editor) => {
      // 可在此根据 projectId 加载已有画布数据，或注册协同/持久化
      if (projectId) {
        // 例如: loadProjectSnapshot(editor, projectId)
      }
    },
    [projectId]
  )

  return (
    <div className={styles.stage}>
      <Tldraw
        onMount={handleMount}
        className={styles.tldraw}
        components={{
          // 可覆盖 tldraw 默认 UI，例如隐藏顶部菜单、使用自定义 Toolbar 等
        }}
      />
    </div>
  )
}
