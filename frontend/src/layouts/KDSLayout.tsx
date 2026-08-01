import { Outlet } from 'react-router-dom'

export function KDSLayout() {
  return (
    <div className="h-screen overflow-hidden select-none" style={{ backgroundColor: '#09090B', color: '#F9FAFB' }}>
      <Outlet />
    </div>
  )
}
