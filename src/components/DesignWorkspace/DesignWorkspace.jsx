import { Toolbar } from '@/components/Toolbar/Toolbar'
import { CanvasStage } from '@/components/Canvas/CanvasStage'
import { PropertySidebar } from '@/components/Sidebar/PropertySidebar'
import { LayersPanel } from '@/components/Layers/LayersPanel'
import styles from './DesignWorkspace.module.css'

export function DesignWorkspace({ projectId }) {
  return (
    <div className={styles.workspace}>
      <Toolbar projectId={projectId} />
      <div className={styles.body}>
        <LayersPanel className={styles.layers} />
        <div className={styles.canvasWrap}>
          <CanvasStage projectId={projectId} />
        </div>
        <PropertySidebar className={styles.sidebar} />
      </div>
    </div>
  )
}
