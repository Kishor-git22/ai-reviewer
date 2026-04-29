'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut, Code2, Cpu, Sparkles } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface SidebarProps {
  children?: React.ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardSidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <SidebarProvider>
      <ShadcnSidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border pb-4">
          <Link href="/" className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              PRISM
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="py-4">
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <div className="mt-6 px-3 group-data-[collapsible=icon]:hidden">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-sidebar-foreground">Active Models</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                  <Cpu className="h-3 w-3" />
                  Llama 3.1
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-400">
                  <Cpu className="h-3 w-3" />
                  Nemotron
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">
                  <Cpu className="h-3 w-3" />
                  Mixtral
                </span>
              </div>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="h-8 w-8 rounded-full border border-sidebar-border"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent">
                <span className="text-xs font-bold text-sidebar-foreground">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {session?.user?.name || session?.user?.email}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">{session?.user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-2 w-full justify-start gap-2 text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
          </Button>
        </SidebarFooter>
      </ShadcnSidebar>
      <main className="flex-1 overflow-hidden">
        <div className="flex h-16 items-center gap-4 border-b border-border px-6 lg:hidden">
          <SidebarTrigger />
          <span className="font-bold">PRISM</span>
        </div>
        {children}
      </main>
    </SidebarProvider>
  )
}

export default DashboardSidebar
