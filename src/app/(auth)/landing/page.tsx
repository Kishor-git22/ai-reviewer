'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Github,
  Code2,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Shield,
  Zap,
  Twitter,
  Linkedin,
  Mail,
  AlertCircle,
} from 'lucide-react'
import { HeroPrism } from '@/components/canvas/HeroPrism'
import { Button } from '@/components/ui/button'
import { NVIDIA_MODELS, LANDING_STATS, FEATURES } from '@/lib/data'

function LandingContent() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      toast.error(getErrorMessage(error), {
        description: 'Please try again or contact support if the issue persists.',
        duration: 5000,
      })
    }
  }, [error])

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

  const handleLogin = async () => {
    setIsLoading(true)
    await signIn('github', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Code2 className="text-white" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">PRISM</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="hidden text-sm font-medium text-slate-400 transition-colors hover:text-white md:block"
            >
              Features
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-slate-400 transition-colors hover:text-white md:block"
            >
              Open Source
            </a>
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              variant="outline"
              className="border-white/10 bg-white/10 text-white hover:bg-white/20"
            >
              {isLoading ? 'Loading...' : 'Log In'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-16 pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative z-10 text-center lg:text-left">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-400">
                <Sparkles size={14} /> Open Source AI Engine
              </div>
              <h1 className="mb-8 text-5xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
                Review Code With{' '}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Total Confidence.
                </span>
              </h1>
              <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl lg:mx-0">
                The world&apos;s first open-source reviewer that refracts every pull request through
                3 massive AI models to eliminate false positives.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  size="lg"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-10 py-6 text-lg font-bold text-black hover:bg-slate-200 sm:w-auto"
                >
                  <Github size={22} />
                  {isLoading ? 'Loading...' : 'Login with GitHub'}
                </Button>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-10 py-6 text-lg font-bold text-white transition-all hover:bg-slate-800 sm:w-auto"
                >
                  <Terminal size={22} /> View Repository
                </a>
              </div>

              {/* Metrics */}
              <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4 lg:mx-0">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="mb-1 text-2xl font-black text-white md:text-3xl">
                    {LANDING_STATS.members}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Members
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="mb-1 text-2xl font-black text-blue-400 md:text-3xl">
                    {LANDING_STATS.prsReviewed}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    PRs Reviewed
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="mb-1 text-2xl font-black text-green-400 md:text-3xl">
                    {LANDING_STATS.successRate}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Accuracy Rate
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Prism */}
            <div className="h-[400px] lg:h-[500px]">
              <HeroPrism />
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Loop Section */}
      <section className="overflow-hidden bg-slate-950 py-12">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Powered by Enterprise NVIDIA Models
          </p>
        </div>
        <div className="relative w-full overflow-hidden border-y border-white/5 bg-slate-900/30 py-8">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...NVIDIA_MODELS, ...NVIDIA_MODELS].map((model, idx) => (
              <div
                key={idx}
                className="mx-12 flex cursor-default items-center gap-3 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              >
                <div className="rounded-lg bg-white/10 p-2">
                  <Cpu size={24} className="text-blue-400" />
                </div>
                <span className="font-bold tracking-tight text-white">{model.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row">
            <div className="max-w-xl">
              <h2 className="mb-6 text-4xl font-black tracking-tight md:text-5xl">
                What makes us different?
              </h2>
              <p className="text-lg text-slate-400">
                Traditional tools use static rules. We use a multi-agent debate system to ensure
                every comment is meaningful.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-white/5 bg-slate-900/50 p-10 transition-all duration-500 hover:border-blue-500/50"
              >
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-slate-950 transition-transform group-hover:scale-110">
                  {f.icon === 'layers' && <Layers className="text-blue-400" />}
                  {f.icon === 'shield' && <Shield className="text-green-400" />}
                  {f.icon === 'zap' && <Zap className="text-yellow-400" />}
                </div>
                <h3 className="mb-4 text-2xl font-bold text-white">{f.title}</h3>
                <p className="leading-relaxed text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 pb-12 pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="col-span-1 md:col-span-1">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                  <Code2 className="text-white" size={18} />
                </div>
                <span className="font-black text-white">PRISM</span>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-slate-500">
                Building the future of secure, high-quality code through collective AI intelligence.
                100% Open Source.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-blue-500 hover:text-white"
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-blue-500 hover:text-white"
                >
                  <Linkedin size={18} />
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-blue-500 hover:text-white"
                >
                  <Github size={18} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-6 font-bold text-white">Product</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 font-bold text-white">Community</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    GitHub Discussions
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Discord Server
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Contributing
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Code of Conduct
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 font-bold text-white">Contact Us</h4>
              <p className="mb-6 text-sm text-slate-500">
                Questions or feedback? We&apos;d love to hear from you.
              </p>
              <a
                href="mailto:hello@prism.dev"
                className="flex items-center gap-2 font-bold text-blue-400 transition-colors hover:text-blue-300"
              >
                <Mail size={16} /> hello@prism.dev
              </a>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-xs font-medium uppercase tracking-widest text-slate-600">
            © 2024 PRISM. Released under MIT License.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LandingContent />
    </Suspense>
  )
}
