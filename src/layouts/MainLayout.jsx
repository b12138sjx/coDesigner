import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar/AppSidebar'
import styles from './MainLayout.module.css'

export function MainLayout() {
  return (
    <div className={styles.layout}>
      <AppSidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
