import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/')
  }

  // Read the sidebar's persisted state so the very first server-rendered
  // frame already matches what the user left it as  otherwise it always
  // paints "expanded" for a beat before snapping to the real state.
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get('sidebar:state')?.value
  const defaultOpen = sidebarState !== 'false'

  return <DashboardSidebar defaultOpen={defaultOpen}>{children}</DashboardSidebar>
}
