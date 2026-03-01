import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import styles from './ProjectsPage.module.css'

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function MenuIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const createProject = useProjectStore((state) => state.createProject)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const removeProject = useProjectStore((state) => state.removeProject)
  const [projectName, setProjectName] = useState('')
  const [createdTip, setCreatedTip] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const menuRef = useRef(null)

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects]
  )

  const openProject = (projectId) => {
    setCurrentProject(projectId)
    navigate(`/project/${projectId}`)
  }

  const handleCreateProject = (event) => {
    event.preventDefault()
    const id = createProject(projectName)
    const project = useProjectStore.getState().getProjectById(id)
    setProjectName('')
    setCreatedTip(`已创建项目：${project?.name || id}，可在下方列表进入`)
  }

  const toggleMenu = useCallback((e, projectId) => {
    e.stopPropagation()
    setMenuOpenId((id) => (id === projectId ? null : projectId))
  }, [])

  const startRename = useCallback((e, project) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setEditingProjectId(project.id)
    setRenameDraft(project.name || '')
  }, [])

  const saveRename = useCallback(
    (projectId) => {
      const name = renameDraft.trim()
      if (name) {
        updateProject(projectId, { name })
      }
      setEditingProjectId(null)
      setRenameDraft('')
    },
    [renameDraft, updateProject]
  )

  const cancelRename = useCallback(() => {
    setEditingProjectId(null)
    setRenameDraft('')
  }, [])

  const handleDelete = useCallback(
    (e, project) => {
      e.stopPropagation()
      setMenuOpenId(null)
      const confirmed = window.confirm(
        `确定要删除项目「${project.name}」吗？此操作不可恢复。`
      )
      if (confirmed) {
        removeProject(project.id)
      }
    },
    [removeProject]
  )

  useEffect(() => {
    if (!menuOpenId) return
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [menuOpenId])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>项目首页</h1>
        <p>从这里选择要进入的项目，进入后再访问设计稿、文档和接口协同模块。</p>
      </header>

      <form className={styles.createForm} onSubmit={handleCreateProject}>
        <input
          type="text"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="输入新项目名称（可留空自动命名）"
        />
        <button type="submit">创建项目</button>
      </form>
      {createdTip && <p className={styles.createdTip}>{createdTip}</p>}

      <section className={styles.list}>
        {sortedProjects.map((project) => (
          <article key={project.id} className={styles.card}>
            <div className={styles.cardMain}>
              <div className={styles.cardContent}>
                {editingProjectId === project.id ? (
                  <div className={styles.cardRename}>
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(project.id)
                        if (e.key === 'Escape') cancelRename()
                      }}
                      className={styles.renameInput}
                      autoFocus
                    />
                    <div className={styles.renameActions}>
                      <button
                        type="button"
                        className={styles.renameSave}
                        onClick={() => saveRename(project.id)}
                      >
                        保存
                      </button>
                      <button type="button" className={styles.renameCancel} onClick={cancelRename}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{project.name}</h3>
                    {(project.brief || '').trim() ? (
                      <p className={styles.cardBrief}>
                        {(project.brief || '').trim().split('\n')[0]}
                      </p>
                    ) : null}
                    <p>项目 ID: {project.id}</p>
                    <p>最近更新: {formatDateTime(project.updatedAt)}</p>
                  </>
                )}
              </div>
              <div className={styles.cardMenuWrap} ref={menuOpenId === project.id ? menuRef : null}>
                <button
                  type="button"
                  className={styles.cardMenuBtn}
                  onClick={(e) => toggleMenu(e, project.id)}
                  title="更多操作"
                  aria-label="更多操作"
                  style={{ padding: '4px' }} 
                  aria-expanded={menuOpenId === project.id}
                >
                  <MenuIcon />
                </button>
                {menuOpenId === project.id && (
                  <div className={styles.cardDropdown}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={(e) => startRename(e, project)}
                    >
                      重命名
                    </button>
                    <button
                      type="button"
                      className={styles.dropdownItemDanger}
                      onClick={(e) => handleDelete(e, project)}
                    >
                      删除项目
                    </button>
                  </div>
                )}
              </div>
            </div>
            {editingProjectId !== project.id && (
              <button type="button" onClick={() => openProject(project.id)}>
                进入项目
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
