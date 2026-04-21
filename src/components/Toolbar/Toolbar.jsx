import { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSessionStore } from '@/stores/sessionStore'
import { downloadJsonFile, ensureExt, formatDateStamp, toSafeFileName } from '@/utils/fileExport'
import styles from './Toolbar.module.css'

export function Toolbar({ canvasApi, projectId }) {
  const showGrid = useCanvasStore((s) => s.showGrid)
  const setShowGrid = useCanvasStore((s) => s.setShowGrid)
  const canUndo = useCanvasStore((s) => s.canUndo())
  const canRedo = useCanvasStore((s) => s.canRedo())
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const getProjectById = useProjectStore((s) => s.getProjectById)
  const authMode = useSessionStore((state) => state.authMode)
  const accessToken = useSessionStore((state) => state.accessToken)
  const project = getProjectById(projectId)
  const expectedRemoteCollaboration = authMode === 'user' && Boolean(accessToken) && Boolean(projectId)
  const [actionTip, setActionTip] = useState('')
  const [collaboration, setCollaboration] = useState(
    canvasApi?.getCollaborationState?.() ||
      (expectedRemoteCollaboration
        ? { mode: 'remote', statusKey: 'connecting', statusLabel: '连接中', onlineUsers: [] }
        : { mode: 'local', onlineUsers: [] })
  )
  const tipTimerRef = useRef(null)
  const baseName = useMemo(
    () => toSafeFileName(project?.name || 'design_canvas', 'design_canvas'),
    [project?.name]
  )
  const isRemoteCollaboration = collaboration?.mode === 'remote'
  const onlineUsers = collaboration?.onlineUsers || []

  const showTip = (text) => {
    setActionTip(text)
    if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current)
    tipTimerRef.current = window.setTimeout(() => setActionTip(''), 1800)
  }

  useEffect(
    () => () => {
      if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (!canvasApi?.subscribeCollaboration) {
      setCollaboration(
        expectedRemoteCollaboration
          ? { mode: 'remote', statusKey: 'connecting', statusLabel: '连接中', onlineUsers: [] }
          : { mode: 'local', onlineUsers: [] }
      )
      return
    }

    const unsubscribe = canvasApi.subscribeCollaboration((nextState) => {
      setCollaboration(nextState || { mode: 'local', onlineUsers: [] })
    })

    return () => {
      unsubscribe?.()
    }
  }, [canvasApi, expectedRemoteCollaboration])

  const handleUndo = () => {
    if (canvasApi?.undo) {
      canvasApi.undo()
      return
    }
    undo()
  }

  const handleRedo = () => {
    if (canvasApi?.redo) {
      canvasApi.redo()
      return
    }
    redo()
  }

  const handleToggleGrid = (checked) => {
    setShowGrid(checked)
    canvasApi?.setGrid?.(checked)
  }

  const handleSave = () => {
    canvasApi?.saveNow?.()
    showTip('已保存')
  }

  const handleExportJson = () => {
    const snapshot = canvasApi?.getSnapshot?.()
    if (!snapshot) {
      showTip('暂无可导出内容')
      return
    }
    const fileName = `${baseName}_${formatDateStamp()}.json`
    downloadJsonFile(
      {
        module: 'design',
        projectId: projectId || null,
        projectName: project?.name || null,
        exportedAt: new Date().toISOString(),
        format: 'tldraw-editor-snapshot',
        snapshot,
      },
      fileName
    )
    showTip('已导出 JSON')
  }

  const handleSaveAs = () => {
    const snapshot = canvasApi?.getSnapshot?.()
    if (!snapshot) {
      showTip('暂无可另存内容')
      return
    }
    const suggested = `${baseName}_${formatDateStamp()}`
    const inputName = window.prompt('请输入另存为文件名', suggested)
    if (inputName === null) return
    const fileName = ensureExt(toSafeFileName(inputName, suggested), '.json')
    downloadJsonFile(
      {
        module: 'design',
        projectId: projectId || null,
        projectName: project?.name || null,
        exportedAt: new Date().toISOString(),
        format: 'tldraw-editor-snapshot',
        snapshot,
      },
      fileName
    )
    showTip('已另存为')
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolGroup}>
        {!isRemoteCollaboration ? (
          <button type="button" className={styles.fileBtn} title="保存当前画布" onClick={handleSave}>
            保存
          </button>
        ) : null}
        <button type="button" className={styles.fileBtn} title="另存为文件" onClick={handleSaveAs}>
          另存为
        </button>
        <button type="button" className={styles.fileBtn} title="导出 JSON" onClick={handleExportJson}>
          导出
        </button>
      </div>
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={styles.iconBtn}
          title="撤销"
          disabled={!canvasApi ? !canUndo : false}
          onClick={handleUndo}
        >
          ↶
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="重做"
          disabled={!canvasApi ? !canRedo : false}
          onClick={handleRedo}
        >
          ↷
        </button>
      </div>
      <div className={styles.toolGroup}>
        <button type="button" className={styles.iconBtn} title="组合选中" onClick={() => canvasApi?.groupSelection?.()}>
          组合
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="解组选中"
          onClick={() => canvasApi?.ungroupSelection?.()}
        >
          解组
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="聚焦选中"
          onClick={() => canvasApi?.zoomToSelection?.()}
        >
          ⌖
        </button>
      </div>
      <div className={styles.toolGroup}>
        <span className={styles.tip}>
          {actionTip || '绘图在左侧，颜色请用画布原生样式面板'}
        </span>
      </div>
      {isRemoteCollaboration ? (
        <div className={styles.toolGroup}>
          <span
            className={[
              styles.syncBadge,
              collaboration?.statusKey === 'synced'
                ? styles.syncSynced
                : collaboration?.statusKey === 'reconnecting'
                  ? styles.syncReconnecting
                  : collaboration?.statusKey === 'offline'
                    ? styles.syncOffline
                    : styles.syncConnecting,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {collaboration?.statusLabel || '连接中'}
          </span>
          <div className={styles.onlineUsers}>
            <span className={styles.onlineCount}>在线 {onlineUsers.length}</span>
            {onlineUsers.slice(0, 4).map((user) => (
              <span
                key={user.id}
                className={styles.userChip}
                title={user.isSelf ? `${user.name}（你）` : user.name}
              >
                <span className={styles.userDot} style={{ backgroundColor: user.color }} />
                <span>{user.isSelf ? `${user.name}（你）` : user.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.toolGroup}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => handleToggleGrid(e.target.checked)}
          />
          <span>网格</span>
        </label>
      </div>
    </header>
  )
}
