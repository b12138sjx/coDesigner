import { Link } from 'react-router-dom'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>CoDesigner</h1>
        <p className={styles.subtitle}>
          融合 Canvas 原型设计、智能文档与接口协同的协同设计平台
        </p>
      </header>
      <section className={styles.cards}>
        <Link to="/design" className={styles.card}>
          <span className={styles.cardIcon}>✏️</span>
          <h3>画布设计</h3>
          <p>拖拽式原型绘制，多人实时协同编辑</p>
        </Link>
        <Link to="/documents" className={styles.card}>
          <span className={styles.cardIcon}>📄</span>
          <h3>智能文档</h3>
          <p>PRD 撰写与接口文档自动关联，文档—原型—接口同步</p>
        </Link>
        <Link to="/api" className={styles.card}>
          <span className={styles.cardIcon}>🔌</span>
          <h3>接口协同</h3>
          <p>接口定义与文档、原型联动，提升研发效率</p>
        </Link>
      </section>
    </div>
  )
}
