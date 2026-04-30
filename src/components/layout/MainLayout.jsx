import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import RightPanel from './RightPanel'
import MobileNav from './MobileNav'
import { SSEProvider } from '@/context/SSEContext'

export default function MainLayout() {
  return (
    <SSEProvider>
      <div className="min-h-screen bg-black">
        <div className="max-w-[1265px] mx-auto flex">
          {/* Sidebar izquierdo */}
          <Sidebar />

          {/* Contenido principal */}
          <main className="flex-1 min-h-screen border-x border-dark-border ml-0 md:ml-[88px] xl:ml-[275px] max-w-[600px]">
            <Outlet />
          </main>

          {/* Panel derecho */}
          <RightPanel />
        </div>

        {/* Nav móvil */}
        <MobileNav />
      </div>
    </SSEProvider>
  )
}
