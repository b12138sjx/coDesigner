import { useParams } from 'react-router-dom'
import styles from './ApiPage.module.css'

export function ApiPage() {
  const { projectId } = useParams()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>接口协同</h1>
        <p>接口定义与文档、原型联动，支持 AI 辅助注释与说明</p>
      </header>
      <div className={styles.placeholder}>
        {projectId ? `项目 ${projectId} 的接口` : '选择或创建项目后在此管理接口文档'}
      </div>
    </div>
  )
}
