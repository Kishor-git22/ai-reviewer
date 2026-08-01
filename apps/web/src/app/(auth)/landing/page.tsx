'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Github,
  Terminal,
  Layers,
  MessageSquare,
  Users,
  Zap,
  Mail,
  Linkedin,
  Menu,
} from 'lucide-react'
import { HeroScene } from '@/components/canvas/HeroScene'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { ModelCube } from '@/components/brand/ModelCube'
import { LogoPlate } from '@/components/brand/LogoPlate'
import { PROVIDER_ICONS } from '@/components/brand/ProviderLogos'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NVIDIA_MODELS, FEATURES } from '@/lib/data'
import { usePublicStats } from '@/hooks/usePrAnalysis'
import { formatNumber } from '@/lib/utils'

const MODEL_CUBE_COLORS = [
  'bg-agent-1/70',
  'bg-agent-2/70',
  'bg-agent-3/70',
  'bg-primary/70',
  'bg-success/70',
  'bg-warning/70',
  'bg-destructive/70',
]

function LandingContent() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const { data: stats, isLoading: isStatsLoading } = usePublicStats()
  const { data: session, status: sessionStatus } = useSession()
  const isAuthenticated = sessionStatus === 'authenticated'
  const displayName = session?.user?.login || session?.user?.name

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return 'There was an issue with the GitHub login. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'To confirm your identity, please sign in with the same account you used originally.'
      case 'EmailSignin':
        return 'The e-mail could not be sent.'
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(getErrorMessage(error), {
        description: 'Please try again or contact support if the issue persists.',
        duration: 5000,
      })
    }
  }, [error])

  const handleLogin = async () => {
    if (isAuthenticated) {
      router.push('/dashboard')
      return
    }
    setIsLoading(true)
    await signIn('github', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-[100rem] items-center justify-between px-6 py-3">
          <Logo />
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="#features"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Features
            </a>
            <a
              href="/docs"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Docs
            </a>
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              variant="outline"
              className="border-border/60 bg-transparent px-3 text-sm text-foreground hover:bg-accent sm:px-4 sm:text-base"
            >
              {isLoading ? 'Loading...' : isAuthenticated ? `Continue as ${displayName}` : 'Log in'}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="shrink-0 text-foreground hover:bg-accent md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 border-border/60 bg-background">
                <SheetHeader>
                  <SheetTitle className="text-left font-display font-medium">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  <SheetClose asChild>
                    <a
                      href="#features"
                      className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      Features
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="/docs"
                      className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      Docs
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="https://github.com/Kishor-git22/ai-reviewer"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <Github className="h-4 w-4" /> Source
                    </a>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-16 pt-36">
        {/* Full-bleed atmosphere  fills the gutters on wide viewports instead
            of leaving flat, empty space either side of the centered column. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[length:36px_36px] opacity-[0.15] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/5 blur-[140px]" />
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-agent-1/10 blur-[130px]" />
        <div className="pointer-events-none absolute -right-40 top-1/3 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-agent-3/10 blur-[130px]" />

        <div className="mx-auto max-w-[100rem]">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative z-10 text-center lg:text-left">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                Open source review engine
              </div>
              <h1 className="mb-8 font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                Code review that
                <br />
                <span className="italic text-primary">argues it out</span> first.
              </h1>
              <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0">
                AI Review sends every pull request to a panel of three independent AI models. They
                debate the change, and only the findings they agree on ever reach you.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  size="lg"
                  className="flex w-full items-center justify-center gap-3 rounded-lg px-8 py-6 text-base font-semibold sm:w-auto"
                >
                  <Github size={20} />
                  {isLoading
                    ? 'Loading...'
                    : isAuthenticated
                      ? `Continue as ${displayName}`
                      : 'Continue with GitHub'}
                </Button>
                <a
                  href="/docs"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border/60 bg-card px-8 py-6 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-auto"
                >
                  <Terminal size={20} /> Read the docs
                </a>
              </div>

              {/* Metrics  real counts from the database, polling every 5s */}
              <div className="mx-auto mt-4 flex max-w-lg items-center justify-center gap-1.5 lg:mx-0 lg:justify-start">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Live
                </span>
              </div>
              <div className="mx-auto mt-3 grid max-w-lg grid-cols-3 gap-4 lg:mx-0">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  {isStatsLoading ? (
                    <div className="mb-1 h-8 w-14 animate-pulse rounded bg-accent/40" />
                  ) : (
                    <div className="mb-1 text-2xl font-semibold text-foreground md:text-3xl">
                      {formatNumber(stats?.members ?? 0)}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active members
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  {isStatsLoading ? (
                    <div className="mb-1 h-8 w-14 animate-pulse rounded bg-accent/40" />
                  ) : (
                    <div className="mb-1 text-2xl font-semibold text-agent-1 md:text-3xl">
                      {formatNumber(stats?.prsReviewed ?? 0)}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    PRs reviewed
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  {isStatsLoading ? (
                    <div className="mb-1 h-8 w-14 animate-pulse rounded bg-accent/40" />
                  ) : (
                    <div className="mb-1 text-2xl font-semibold text-success md:text-3xl">
                      {stats?.consensusRate != null ? `${stats.consensusRate}%` : ''}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Accuracy rate
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Consensus Scene */}
            <div className="h-[400px] lg:h-[500px]">
              <HeroScene />
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Loop Section */}
      <section className="overflow-hidden bg-background py-12">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Powered by enterprise NVIDIA models
          </p>
        </div>
        <div className="relative w-full overflow-hidden border-y border-border/60 bg-card/20 py-8">
          <div className="flex w-max animate-marquee whitespace-nowrap">
            {[...NVIDIA_MODELS, ...NVIDIA_MODELS].map((model, idx) => {
              const ProviderIcon = PROVIDER_ICONS[model.provider]
              return (
                <div
                  key={idx}
                  className="mx-12 flex cursor-default items-center gap-4 opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                >
                  {ProviderIcon ? (
                    <LogoPlate>
                      <ProviderIcon className="h-4 w-4 text-foreground" />
                    </LogoPlate>
                  ) : (
                    <ModelCube colorClassName={MODEL_CUBE_COLORS[idx % MODEL_CUBE_COLORS.length]} />
                  )}
                  <span className="font-semibold tracking-tight text-foreground">{model.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-14">
        <div className="mx-auto max-w-[100rem]">
          <div className="mb-8 max-w-2xl">
            <h2 className="mb-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
              Why trust this one?
            </h2>
            <p className="text-lg text-muted-foreground">
              Most AI reviewers say yes to everything, flag every nitpick, hedge every verdict, and
              get muted within a week. This one only speaks once three independent models have
              actually argued it out and landed on the same answer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background">
                  {f.icon === 'layers' && <Layers className="text-agent-1" size={18} />}
                  {f.icon === 'debate' && <MessageSquare className="text-agent-2" size={18} />}
                  {f.icon === 'panel' && <Users className="text-agent-3" size={18} />}
                  {f.icon === 'zap' && <Zap className="text-warning" size={18} />}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/60 px-6 pb-10 pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="mx-auto max-w-[100rem]">
          <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
            <div>
              <Logo className="mb-4" markClassName="h-7 w-7" textClassName="text-base" />
              <p className="max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
                Consensus-driven code review, built in the open.
              </p>
            </div>

            <div>
              <h4 className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-agent-1" />
                Product
              </h4>
              <ul className="space-y-3.5 text-sm text-muted-foreground">
                <li>
                  <a href="/docs" className="transition-colors hover:text-foreground">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/docs#api-reference" className="transition-colors hover:text-foreground">
                    API reference
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-agent-2" />
                Community
              </h4>
              <ul className="space-y-3.5 text-sm text-muted-foreground">
                <li>
                  <a href="/docs#contributing" className="transition-colors hover:text-foreground">
                    Contributing
                  </a>
                </li>
                <li>
                  <a
                    href="/docs#code-of-conduct"
                    className="transition-colors hover:text-foreground"
                  >
                    Code of conduct
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Kishor-git22/ai-reviewer"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Github size={14} /> Source
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-agent-3" />
                Contact
              </h4>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  Questions or feedback? We&apos;d love to hear from you.
                </p>
                <a
                  href="mailto:kishora.2204@gmail.com"
                  className="flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  <Mail size={15} className="shrink-0" />
                  <span className="break-all">kishora.2204@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5 border-t border-border/60 pt-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
              <LogoMark className="h-4 w-4" />
              <span>
                © 2026 <span className="font-semibold text-foreground">AI Review</span>
                <span className="mx-1.5 text-border">·</span>
                MIT License
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Built by <span className="font-semibold text-foreground">Kishor</span>
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://github.com/Kishor-git22"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub profile"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                >
                  <Github size={15} />
                </a>
                <a
                  href="https://www.linkedin.com/in/kishor-annamalai/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn profile"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingContent />
    </Suspense>
  )
}
