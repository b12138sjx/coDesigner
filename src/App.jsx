import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { DesignPage } from './pages/DesignPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ApiPage } from './pages/ApiPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="design/:projectId?" element={<DesignPage />} />
        <Route path="documents/:projectId?" element={<DocumentsPage />} />
        <Route path="api/:projectId?" element={<ApiPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
