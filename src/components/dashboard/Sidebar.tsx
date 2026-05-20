'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut, Code2, Cpu, Sparkles, ArrowLeft } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useUserSettings } from '@/hooks/usePrAnalysis'

import { cn } from '@/lib/utils'
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
  SidebarTrigger,
  SidebarInset,
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
  const router = useRouter()
  const { data: session } = useSession()
  const { data: settings } = useUserSettings()

  const isMainDashboard = pathname === '/dashboard'

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          '--sidebar-width-icon': '0rem',
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-svh w-full bg-background p-1">
        {/* Floating Independent Sidebar Panel */}
        <ShadcnSidebar
          variant="floating"
          collapsible="icon"
          className="border-none bg-transparent"
        >
          <div className="flex h-full flex-col gap-2">
            {/* Sidebar Branding & Content Container */}
            <div className="flex flex-1 flex-col rounded-[2rem] border border-border/50 bg-card/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <SidebarHeader className="border-b border-border/50 p-4">
                <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
                    <Code2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-black tracking-tighter text-foreground">
                    PRISM
                  </span>
                </Link>
              </SidebarHeader>

              <SidebarContent className="gap-0 px-1 py-3">
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name} className="mb-0.5">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                        className="h-10 rounded-xl transition-all duration-300 hover:bg-primary/10 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-lg data-[active=true]:shadow-primary/20"
                      >
                        <Link href={item.href} className="flex items-center gap-2.5 px-2.5">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-bold">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                {/* Status Section */}
                <div className="mt-4 px-2 group-data-[collapsible=icon]:hidden">
                  <div className="rounded-[1.5rem] border border-border/50 bg-accent/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-1 animate-pulse rounded-full bg-green-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Neural Engine
                        </span>
                      </div>
                      <Badge variant="outline" className="h-4 border-primary/20 bg-primary/5 px-1.5 text-[7px] font-black uppercase text-primary">
                        Active
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {[
                        { id: settings?.codeReviewModel || 'llama-3.1', label: 'Review' },
                        { id: settings?.securityModel || 'deepseek-v4-pro', label: 'Security' },
                        { id: settings?.scoringModel || 'mistral-medium-3.5', label: 'Score' },
                        { id: settings?.referenceModel || 'phi-4', label: 'Reference' }
                      ].map((item, i) => {
                        const colors = ['text-blue-400', 'text-purple-400', 'text-yellow-400', 'text-green-400'];
                        const displayName = item.id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        return (
                          <div key={item.id + i} className="flex items-center justify-between gap-2 rounded-xl bg-background/40 p-1.5 transition-all hover:bg-background/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <Cpu className={cn("h-3 w-3 shrink-0", colors[i])} />
                              <span className="truncate text-[9px] font-bold text-foreground">
                                {displayName}
                              </span>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-wider text-muted-foreground px-1 bg-accent/35 rounded-md border border-border/20 shrink-0">
                              {item.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </SidebarContent>

              <SidebarFooter className="border-t border-border/50 p-4">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                  {session?.user?.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={session.user.image}
                        alt={session.user.login || 'User'}
                        className="h-8 w-8 shrink-0 rounded-xl border border-border/50 object-cover shadow-sm transition-transform hover:scale-110"
                      />
                    </>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-[10px] font-black uppercase">
                      {session?.user?.login?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[11px] font-black text-foreground">
                      {session?.user?.login}
                    </p>
                    <p className="truncate text-[8px] font-bold text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="mt-4 w-full justify-start gap-2.5 rounded-xl px-2.5 font-black text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
                </Button>
              </SidebarFooter>
            </div>
          </div>
        </ShadcnSidebar>

        {/* Separated Main Content Panel - Dynamically synchronized with Sidebar state */}
        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-border/50 bg-card/30 shadow-2xl shadow-black/20 backdrop-blur-xl transition-[margin] duration-300 ease-in-out md:peer-data-[state=expanded]:ml-[calc(var(--sidebar-width)+theme(spacing.1))] md:peer-data-[state=collapsed]:ml-0">
          {/* Header - Transparent Glass */}
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-border/50 px-8">
            <div className="flex items-center gap-6">
              {!isMainDashboard && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-10 w-10 rounded-xl border-border/50 bg-background/50 hover:bg-accent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Badge variant="outline" className="hidden rounded-full px-4 font-black sm:flex">
                v1.0.0 Stable
              </Badge>
            </div>
          </header>

          {/* Independent Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-0 scrollbar-hide focus:outline-none">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default DashboardSidebar
