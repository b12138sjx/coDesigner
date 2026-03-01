import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import styles from './ProjectOverviewPage.module.css'

const moduleCards = [
  { path: 'design', title: '画布设计', desc: '原型绘制、图层管理与画布协同', icon: '✏️' },
  { path: 'documents', title: '智能文档', desc: 'PRD 和设计说明协作管理', icon: '📄' },
  { path: 'api', title: '接口协同', desc: '接口定义与文档联动维护', icon: '🔌' },
]

export function ProjectOverviewPage() {
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)

  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId)
    }
  }, [projectId, setCurrentProject])

  if (!project) return <Navigate to="/projects" replace />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{project.name}</h1>
        <p>你已进入项目空间。请选择一个模块继续工作。</p>
      </header>

      <section className={styles.cards}>
        {moduleCards.map((card) => (
          <Link key={card.path} to={`/${card.path}/${project.id}`} className={styles.card}>
            <span className={styles.cardIcon}>{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
