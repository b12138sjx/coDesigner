import { useParams } from 'react-router-dom'
import styles from './DocumentsPage.module.css'

export function DocumentsPage() {
  const { projectId } = useParams()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>智能文档</h1>
        <p>PRD 文档撰写与接口文档自动关联，实现文档—原型—接口动态同步</p>
      </header>
      <div className={styles.placeholder}>
        {projectId ? `项目 ${projectId} 的文档` : '选择或创建项目后在此编辑 PRD 与设计说明'}
      </div>
    </div>
  )
}
