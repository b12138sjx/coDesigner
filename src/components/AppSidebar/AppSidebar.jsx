import { NavLink } from 'react-router-dom'
import styles from './AppSidebar.module.css'

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/design', label: '画布设计', icon: '✏️' },
  { to: '/documents', label: '智能文档', icon: '📄' },
  { to: '/api', label: '接口协同', icon: '🔌' },
]

export function AppSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>Co</span>
        <span>Designer</span>
      </div>
      <nav className={styles.nav}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')
            }
            end={to === '/'}
          >
            <span className={styles.navIcon}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
