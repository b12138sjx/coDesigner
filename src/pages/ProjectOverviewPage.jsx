import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useSessionStore } from '@/stores/sessionStore'
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
  const projectDetail = useProjectStore((state) => state.getProjectDetailById(projectId))
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const loadProjectDetail = useProjectStore((state) => state.loadProjectDetail)
  const updateProject = useProjectStore((state) => state.updateProject)
  const addProjectMember = useProjectStore((state) => state.addProjectMember)
  const removeProjectMember = useProjectStore((state) => state.removeProjectMember)
  const authMode = useSessionStore((state) => state.authMode)
  const [isEditingBrief, setIsEditingBrief] = useState(false)
  const [briefDraft, setBriefDraft] = useState('')
  const [memberDraft, setMemberDraft] = useState('')
  const [memberBusy, setMemberBusy] = useState(false)
  const [memberMessage, setMemberMessage] = useState('')
  const [memberError, setMemberError] = useState('')

  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId)
      if (authMode === 'user') {
        void loadProjectDetail(projectId).catch(() => {})
      }
    }
  }, [authMode, loadProjectDetail, projectId, setCurrentProject])

  const accessRole = projectDetail?.accessRole || project?.accessRole || 'owner'
  const members = projectDetail?.members || []
  const canManageProject = authMode !== 'user' || accessRole === 'owner'

  const startEditBrief = () => {
    if (!canManageProject) return
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

  const inviteMember = async (event) => {
    event.preventDefault()
    if (!projectId || !memberDraft.trim()) return

    setMemberBusy(true)
    setMemberError('')
    setMemberMessage('')

    try {
      await addProjectMember(projectId, memberDraft.trim())
      setMemberDraft('')
      setMemberMessage('协作者已添加')
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : '添加协作者失败')
    } finally {
      setMemberBusy(false)
    }
  }

  const handleRemoveMember = async (member) => {
    if (!projectId || member.isOwner) return
    const confirmed = window.confirm(`确定移除协作者「${member.displayName || member.username}」吗？`)
    if (!confirmed) return

    setMemberBusy(true)
    setMemberError('')
    setMemberMessage('')

    try {
      await removeProjectMember(projectId, member.id)
      setMemberMessage('协作者已移除')
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : '移除协作者失败')
    } finally {
      setMemberBusy(false)
    }
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
          <div className={styles.introMeta}>
            <span className={styles.introLabel}>项目简介</span>
            <span className={styles.roleBadge}>{accessRole === 'owner' ? 'Owner' : 'Editor'}</span>
          </div>
          {!isEditingBrief && canManageProject && (
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
            onClick={canManageProject ? startEditBrief : undefined}
            onKeyDown={(e) => canManageProject && e.key === 'Enter' && startEditBrief()}
            role={canManageProject ? 'button' : undefined}
            tabIndex={canManageProject ? 0 : -1}
          >
            {showPlaceholder
              ? BRIEF_PLACEHOLDER
              : briefText.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
          </div>
        )}
      </div>

      <section className={styles.collabSection}>
        <div className={styles.collabHead}>
          <div>
            <h2>协作者</h2>
            <p>
              {authMode === 'user'
                ? '在线协作前先把项目成员关系建好。owner 可按用户名邀请已注册用户。'
                : '登录账号后可邀请协作者共同编辑画布。'}
            </p>
          </div>
          <span className={styles.collabCount}>{members.length || 1} 人</span>
        </div>

        {authMode === 'user' && canManageProject ? (
          <form className={styles.inviteForm} onSubmit={inviteMember}>
            <input
              type="text"
              value={memberDraft}
              onChange={(event) => setMemberDraft(event.target.value)}
              placeholder="输入已注册用户名"
              disabled={memberBusy}
            />
            <button type="submit" disabled={memberBusy || !memberDraft.trim()}>
              {memberBusy ? '处理中...' : '添加协作者'}
            </button>
          </form>
        ) : null}

        {memberError ? <p className={styles.memberError}>{memberError}</p> : null}
        {memberMessage ? <p className={styles.memberMessage}>{memberMessage}</p> : null}

        <div className={styles.memberList}>
          {(members.length > 0 ? members : [{ id: 'owner-local', username: 'local', displayName: '当前用户', isOwner: true }]).map((member) => (
            <div key={member.id} className={styles.memberItem}>
              <div className={styles.memberAvatar}>
                {(member.displayName || member.username || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.memberMeta}>
                <strong>{member.displayName || member.username}</strong>
                <span>@{member.username || 'local-user'}</span>
              </div>
              <span className={styles.memberRole}>{member.isOwner ? 'Owner' : 'Editor'}</span>
              {authMode === 'user' && canManageProject && !member.isOwner ? (
                <button
                  type="button"
                  className={styles.memberRemove}
                  onClick={() => handleRemoveMember(member)}
                  disabled={memberBusy}
                >
                  移除
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

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
