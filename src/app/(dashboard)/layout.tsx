import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar>{children}</DashboardSidebar>
    </div>
  )
}
