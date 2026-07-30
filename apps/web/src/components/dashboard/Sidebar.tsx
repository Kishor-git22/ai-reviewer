'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut, Cpu, ArrowLeft, BookOpen } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useUserSettings } from '@/hooks/usePrAnalysis'

import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'

interface SidebarProps {
  children?: React.ReactNode
  defaultOpen?: boolean
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

const AGENT_COLORS = ['bg-agent-1', 'bg-agent-2', 'bg-agent-3']

export function DashboardSidebar({ children, defaultOpen = true }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: settings } = useUserSettings()

  const isMainDashboard = pathname === '/dashboard'

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          '--sidebar-width-icon': '0rem',
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-svh w-full bg-background p-1">
        {/* Floating Independent Sidebar Panel */}
        <ShadcnSidebar variant="floating" collapsible="icon" className="border-none bg-transparent">
          <div className="flex h-full flex-col gap-2">
            <div className="flex flex-1 flex-col rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/20">
              <SidebarHeader className="border-b border-border/60 p-4">
                <Link href="/" className="group-data-[collapsible=icon]:hidden">
                  <Logo markClassName="h-8 w-8" textClassName="text-base" />
                </Link>
              </SidebarHeader>

              <SidebarContent className="gap-0 px-2 py-3">
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name} className="mb-0.5">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                        className="h-10 rounded-lg transition-colors duration-150 hover:bg-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                      >
                        <Link href={item.href} className="flex items-center gap-2.5 px-2.5">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="text-[13px] font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                {/* Status Section */}
                <div className="mt-4 px-1.5 group-data-[collapsible=icon]:hidden">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Review panel
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="h-4 border-primary/30 bg-primary/10 px-1.5 text-[9px] font-semibold text-primary"
                      >
                        Active
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {settings?.selectedModels?.map((mid: string, i: number) => (
                        <div
                          key={mid}
                          className="flex items-center gap-2.5 rounded-lg bg-background/60 px-2 py-1.5"
                        >
                          <span
                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', AGENT_COLORS[i % 3])}
                          />
                          <span className="truncate text-[11px] font-medium text-foreground/80">
                            {mid
                              .split('-')
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(' ')}
                          </span>
                        </div>
                      ))}
                      {!settings?.selectedModels?.length &&
                        [1, 2, 3].map((i) => (
                          <div key={i} className="h-6 animate-pulse rounded-lg bg-background/30" />
                        ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto px-1.5 pt-3 group-data-[collapsible=icon]:hidden">
                  <a
                    href="/docs"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Documentation
                  </a>
                </div>
              </SidebarContent>

              <SidebarFooter className="border-t border-border/60 p-3">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.login || 'User'}
                      className="h-8 w-8 shrink-0 rounded-lg border border-border/60 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-[10px] font-semibold uppercase">
                      {session?.user?.login?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[12px] font-semibold text-foreground">
                      {session?.user?.login}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="mt-3 w-full justify-start gap-2.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
                </Button>
              </SidebarFooter>
            </div>
          </div>
        </ShadcnSidebar>

        {/* Separated Main Content Panel - Dynamically synchronized with Sidebar state */}
        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-lg shadow-black/20 transition-[margin] duration-200 ease-out md:peer-data-[state=collapsed]:ml-0 md:peer-data-[state=expanded]:ml-[calc(var(--sidebar-width)+theme(spacing.1))]">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-6">
            <div className="flex items-center gap-4">
              {!isMainDashboard && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-9 w-9 rounded-lg border-border/60 bg-background/50 hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Badge
                variant="outline"
                className="hidden items-center gap-1.5 rounded-md border-border/60 px-2.5 font-medium text-muted-foreground sm:flex"
              >
                <Cpu className="h-3 w-3" />
                v1.0
              </Badge>
            </div>
          </header>

          <main className="scrollbar-hide flex-1 overflow-y-auto p-0 focus:outline-none">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default DashboardSidebar
