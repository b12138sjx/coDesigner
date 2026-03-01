import { useMemo, useState } from 'react'
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

export function ProjectsPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const createProject = useProjectStore((state) => state.createProject)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const [projectName, setProjectName] = useState('')
  const [createdTip, setCreatedTip] = useState('')

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
            <div>
              <h3>{project.name}</h3>
              <p>项目 ID: {project.id}</p>
              <p>最近更新: {formatDateTime(project.updatedAt)}</p>
            </div>
            <button type="button" onClick={() => openProject(project.id)}>
              进入项目
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
