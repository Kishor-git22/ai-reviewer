'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo className="mb-12" />
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm font-medium text-muted-foreground">
        An unexpected error interrupted this page. It&apos;s been logged try again, or head back
        home.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button onClick={() => reset()} className="h-11 rounded-lg px-6 font-semibold">
          Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-lg border-border/60 px-6 font-semibold"
        >
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
