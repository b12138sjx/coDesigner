import { request } from '@/utils/apiClient'

function encodeProjectId(projectId) {
  return encodeURIComponent(projectId)
}

export const projectApi = {
  list(accessToken) {
    return request('/projects', { accessToken })
  },
  create(payload, accessToken) {
    return request('/projects', {
      method: 'POST',
      body: payload,
      accessToken,
    })
  },
  get(projectId, accessToken) {
    return request(`/projects/${encodeProjectId(projectId)}`, {
      accessToken,
    })
  },
  update(projectId, payload, accessToken) {
    return request(`/projects/${encodeProjectId(projectId)}`, {
      method: 'PATCH',
      body: payload,
      accessToken,
    })
  },
  remove(projectId, accessToken) {
    return request(`/projects/${encodeProjectId(projectId)}`, {
      method: 'DELETE',
      accessToken,
    })
  },
  importLocal(payload, accessToken) {
    return request('/projects/import-local', {
      method: 'POST',
      body: payload,
      accessToken,
    })
  },
  getCanvas(projectId, accessToken) {
    return request(`/projects/${encodeProjectId(projectId)}/canvas`, {
      accessToken,
    })
  },
  saveCanvas(projectId, payload, accessToken) {
    return request(`/projects/${encodeProjectId(projectId)}/canvas`, {
      method: 'PUT',
      body: payload,
      accessToken,
    })
  },
}
