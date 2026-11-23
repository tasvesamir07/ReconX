import type { ReactNode } from 'react'
import { DashboardTopbar } from './components/capitalio/topbar'
import './dashboard.css'

type DashboardLayoutProps = {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="capitalio-dashboard w-full min-h-full bg-[#0B0B0C] text-white">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B0B0C]">
          <DashboardTopbar />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </main>
    </div>
  )
}
