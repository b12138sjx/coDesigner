import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useApiStore } from '@/stores/apiStore'
import styles from './ApiPage.module.css'

const STATUS_OPTIONS = ['待确认', '开发中', '已联调', '已完成']
const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const NOTE_ROLE_OPTIONS = ['前端', '后端', '产品', '测试']

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ApiPage() {
  const { projectId } = useParams()
  const project = useProjectStore((state) => state.getProjectById(projectId))
  const apis = useApiStore((state) => (projectId ? state.getApis(projectId) : []))
  const addApi = useApiStore((state) => state.addApi)
  const updateApi = useApiStore((state) => state.updateApi)
  const removeApi = useApiStore((state) => state.removeApi)
  const addApiNote = useApiStore((state) => state.addApiNote)

  const [newApi, setNewApi] = useState({
    name: '',
    method: 'GET',
    path: '',
    status: '待确认',
    owner: '',
    description: '',
    frontendNeed: '',
    backendPlan: '',
    requestExample: '',
    responseExample: '',
    acceptance: '',
  })
  const [noteDrafts, setNoteDrafts] = useState({})

  const handleCreateApi = (event) => {
    event.preventDefault()
    if (!projectId || !newApi.name.trim() || !newApi.path.trim()) return
    addApi(projectId, {
      id: `api_${Date.now()}`,
      ...newApi,
      name: newApi.name.trim(),
      path: newApi.path.trim(),
      owner: newApi.owner.trim(),
      description: newApi.description.trim(),
      frontendNeed: newApi.frontendNeed.trim(),
      backendPlan: newApi.backendPlan.trim(),
      requestExample: newApi.requestExample.trim(),
      responseExample: newApi.responseExample.trim(),
      acceptance: newApi.acceptance.trim(),
      notes: [],
      updatedAt: Date.now(),
    })
    setNewApi({
      name: '',
      method: 'GET',
      path: '',
      status: '待确认',
      owner: '',
      description: '',
      frontendNeed: '',
      backendPlan: '',
      requestExample: '',
      responseExample: '',
      acceptance: '',
    })
  }

  const updateField = (apiId, field, value) => {
    if (!projectId) return
    updateApi(projectId, apiId, { [field]: value, updatedAt: Date.now() })
  }

  const submitNote = (apiId) => {
    const draft = noteDrafts[apiId] || { role: '前端', text: '' }
    const text = (draft.text || '').trim()
    if (!projectId || !text) return
    addApiNote(projectId, apiId, {
      id: `note_${Date.now()}`,
      author: `${draft.role}成员`,
      role: draft.role,
      text,
      createdAt: Date.now(),
    })
    setNoteDrafts((state) => ({ ...state, [apiId]: { ...draft, text: '' } }))
    updateApi(projectId, apiId, { updatedAt: Date.now() })
  }

  const setNoteDraft = (apiId, updates) => {
    setNoteDrafts((state) => {
      const prev = state[apiId] || { role: '前端', text: '' }
      return {
        ...state,
        [apiId]: {
          ...prev,
          ...updates,
        },
      }
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>接口协同</h1>
        <p>{project?.name || '当前项目'} · 前后端需求对齐、参数约定、联调记录一体管理</p>
      </header>
      <form className={styles.createForm} onSubmit={handleCreateApi}>
        <input
          value={newApi.name}
          onChange={(event) => setNewApi((state) => ({ ...state, name: event.target.value }))}
          placeholder="接口名称，如：创建项目"
        />
        <select
          value={newApi.method}
          onChange={(event) => setNewApi((state) => ({ ...state, method: event.target.value }))}
        >
          {METHOD_OPTIONS.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
        <input
          value={newApi.path}
          onChange={(event) => setNewApi((state) => ({ ...state, path: event.target.value }))}
          placeholder="/api/v1/xxx"
        />
        <input
          value={newApi.owner}
          onChange={(event) => setNewApi((state) => ({ ...state, owner: event.target.value }))}
          placeholder="负责人"
        />
        <input
          value={newApi.description}
          onChange={(event) => setNewApi((state) => ({ ...state, description: event.target.value }))}
          placeholder="接口说明"
        />
        <input
          value={newApi.frontendNeed}
          onChange={(event) => setNewApi((state) => ({ ...state, frontendNeed: event.target.value }))}
          placeholder="前端诉求（可选）"
        />
        <input
          value={newApi.backendPlan}
          onChange={(event) => setNewApi((state) => ({ ...state, backendPlan: event.target.value }))}
          placeholder="后端方案（可选）"
        />
        <button type="submit">新增接口</button>
      </form>

      {apis.length > 0 ? (
        <div className={styles.list}>
          {apis.map((api) => (
            <article key={api.id} className={styles.card}>
              <div className={[styles.method, styles[`method${api.method}`]].filter(Boolean).join(' ')}>
                {api.method}
              </div>
              <div className={styles.content}>
                <div className={styles.row}>
                  <input
                    className={styles.nameInput}
                    value={api.name || ''}
                    onChange={(event) => updateField(api.id, 'name', event.target.value)}
                  />
                  <select
                    value={api.method || 'GET'}
                    onChange={(event) => updateField(api.id, 'method', event.target.value)}
                  >
                    {METHOD_OPTIONS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                  <select
                    value={api.status || '待确认'}
                    onChange={(event) => updateField(api.id, 'status', event.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <input
                  className={styles.pathInput}
                  value={api.path || ''}
                  onChange={(event) => updateField(api.id, 'path', event.target.value)}
                />
                <textarea
                  className={styles.descInput}
                  value={api.description || ''}
                  onChange={(event) => updateField(api.id, 'description', event.target.value)}
                  placeholder="接口说明"
                  rows={2}
                />
                <div className={styles.fieldGrid}>
                  <label className={styles.fieldItem}>
                    <span>前端诉求</span>
                    <textarea
                      value={api.frontendNeed || ''}
                      onChange={(event) => updateField(api.id, 'frontendNeed', event.target.value)}
                      rows={3}
                      placeholder="例如：失败错误码、分页排序、空状态处理"
                    />
                  </label>
                  <label className={styles.fieldItem}>
                    <span>后端方案</span>
                    <textarea
                      value={api.backendPlan || ''}
                      onChange={(event) => updateField(api.id, 'backendPlan', event.target.value)}
                      rows={3}
                      placeholder="例如：字段、规则、异常返回格式"
                    />
                  </label>
                  <label className={styles.fieldItem}>
                    <span>请求参数示例</span>
                    <textarea
                      value={api.requestExample || ''}
                      onChange={(event) => updateField(api.id, 'requestExample', event.target.value)}
                      rows={3}
                      placeholder='如：{ "page": 1, "pageSize": 20 }'
                    />
                  </label>
                  <label className={styles.fieldItem}>
                    <span>返回示例</span>
                    <textarea
                      value={api.responseExample || ''}
                      onChange={(event) => updateField(api.id, 'responseExample', event.target.value)}
                      rows={3}
                      placeholder='如：{ "code": 0, "data": {} }'
                    />
                  </label>
                </div>
                <label className={styles.acceptance}>
                  <span>验收标准</span>
                  <textarea
                    value={api.acceptance || ''}
                    onChange={(event) => updateField(api.id, 'acceptance', event.target.value)}
                    rows={2}
                    placeholder="例如：错误码覆盖、响应时长、字段完整性"
                  />
                </label>
                <div className={styles.noteBlock}>
                  <p className={styles.noteTitle}>沟通记录</p>
                  <div className={styles.notes}>
                    {(api.notes || []).map((note) => (
                      <div key={note.id} className={styles.noteItem}>
                        <div className={styles.noteMeta}>
                          <strong>{note.author}</strong>
                          <span className={styles.noteRole}>{note.role || '讨论'}</span>
                          <span className={styles.noteTime}>{formatTime(note.createdAt)}</span>
                        </div>
                        <span>{note.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.noteInputRow}>
                    <select
                      value={(noteDrafts[api.id] && noteDrafts[api.id].role) || '前端'}
                      onChange={(event) => setNoteDraft(api.id, { role: event.target.value })}
                    >
                      {NOTE_ROLE_OPTIONS.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                    <input
                      value={(noteDrafts[api.id] && noteDrafts[api.id].text) || ''}
                      onChange={(event) => setNoteDraft(api.id, { text: event.target.value })}
                      placeholder="添加前后端沟通备注"
                    />
                    <button type="button" onClick={() => submitNote(api.id)}>
                      添加
                    </button>
                  </div>
                </div>
              </div>
              <div className={styles.meta}>
                <span className={styles.status}>{api.status || '待确认'}</span>
                <input
                  className={styles.ownerInput}
                  value={api.owner || ''}
                  onChange={(event) => updateField(api.id, 'owner', event.target.value)}
                  placeholder="负责人"
                />
                <span className={styles.updatedAt}>更新于 {formatTime(api.updatedAt)}</span>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => projectId && removeApi(projectId, api.id)}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.placeholder}>当前项目暂无接口定义，可先在样例项目中查看示例。</div>
      )}
    </div>
  )
}
