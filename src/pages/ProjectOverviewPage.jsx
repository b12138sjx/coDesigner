import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import styles from './ProjectOverviewPage.module.css'

const moduleCards = [
  { path: 'design', title: '画布设计', desc: '原型绘制、图层管理与画布协同', icon: '✏️' },
  { path: 'documents', title: '智能文档', desc: 'PRD 和设计说明协作管理', icon: '📄' },
  { path: 'api', title: '接口协同', desc: '接口定义与文档联动维护', icon: '🔌' },
]

const BRIEF_PLACEHOLDER = '暂无简介。点击右上角编辑补充这个项目是做什么的，方便进入前快速了解。'

function EditIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function ProjectOverviewPage() {
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const [isEditingBrief, setIsEditingBrief] = useState(false)
  const [briefDraft, setBriefDraft] = useState('')

  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId)
    }
  }, [projectId, setCurrentProject])

  const startEditBrief = () => {
    setBriefDraft(project?.brief ?? '')
    setIsEditingBrief(true)
  }

  const saveBrief = () => {
    if (projectId != null) {
      updateProject(projectId, { brief: briefDraft.trim() })
    }
    setIsEditingBrief(false)
  }

  const cancelEditBrief = () => {
    setBriefDraft(project?.brief ?? '')
    setIsEditingBrief(false)
  }

  if (!project) return <Navigate to="/projects" replace />

  const briefText = (project.brief || '').trim()
  const showPlaceholder = !briefText

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{project.name}</h1>
        <p>你已进入项目空间。请选择一个模块继续工作。</p>
      </header>

      <div className={styles.intro}>
        <div className={styles.introHeader}>
          <span className={styles.introLabel}>项目简介</span>
          {!isEditingBrief && (
            <button
              type="button"
              className={styles.introEditIcon}
              onClick={startEditBrief}
              title="编辑简介"
              aria-label="编辑简介"
            >
              <EditIcon />
            </button>
          )}
        </div>
        {isEditingBrief ? (
          <>
            <textarea
              className={styles.introTextarea}
              value={briefDraft}
              onChange={(e) => setBriefDraft(e.target.value)}
              placeholder={BRIEF_PLACEHOLDER}
              rows={4}
              autoFocus
            />
            <div className={styles.introActions}>
              <button type="button" className={styles.introBtnPrimary} onClick={saveBrief}>
                保存
              </button>
              <button type="button" className={styles.introBtnSecondary} onClick={cancelEditBrief}>
                取消
              </button>
            </div>
          </>
        ) : (
          <div
            className={showPlaceholder ? styles.introPlaceholder : styles.introText}
            onClick={startEditBrief}
            onKeyDown={(e) => e.key === 'Enter' && startEditBrief()}
            role="button"
            tabIndex={0}
          >
            {showPlaceholder
              ? BRIEF_PLACEHOLDER
              : briefText.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
          </div>
        )}
      </div>

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
