import { useParams } from 'react-router-dom'
import { DesignWorkspace } from '@/components/DesignWorkspace/DesignWorkspace'

export function DesignPage() {
  const { projectId } = useParams()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DesignWorkspace projectId={projectId} />
    </div>
  )
}
