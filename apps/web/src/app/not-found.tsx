import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo className="mb-12" />
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card">
        <Compass className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-sm text-sm font-medium text-muted-foreground">
        The link you followed may be broken, or the page may have moved.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild className="h-11 rounded-lg px-6 font-semibold">
          <Link href="/">Back to home</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-lg border-border/60 px-6 font-semibold"
        >
          <Link href="/docs">Read the docs</Link>
        </Button>
      </div>
    </div>
  )
}
