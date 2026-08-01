import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Docs  AI Review',
  description: 'Overview, features, API reference, contributing guide, and code of conduct.',
}

const NAV = [
  { href: '#overview', label: 'Overview' },
  { href: '#features', label: 'Features' },
  { href: '#api-reference', label: 'API reference' },
  { href: '#contributing', label: 'Contributing' },
  { href: '#code-of-conduct', label: 'Code of conduct' },
]

function Endpoint({
  method,
  path,
  auth,
  children,
}: {
  method: string
  path: string
  auth: 'Public' | 'Bearer token'
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
          {method}
        </span>
        <code className="font-mono text-sm text-foreground">{path}</code>
        <span
          className={
            auth === 'Public'
              ? 'ml-auto rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success'
              : 'ml-auto rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning'
          }
        >
          {auth}
        </span>
      </div>
      <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-36 py-12 first:pt-0 lg:scroll-mt-28">
      <h2 className="mb-6 font-display text-3xl font-medium tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo markClassName="h-7 w-7" textClassName="text-base" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </header>

      {/* Mobile/tablet section jump bar — the sticky side nav below is
          hidden under lg, so without this there'd be no way to reach a
          section short of scrolling past everything ahead of it. */}
      <nav className="sticky top-16 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md lg:hidden">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-6 py-3">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full border border-border/60 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[200px_1fr]">
        {/* Side nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="min-w-0 divide-y divide-border/60">
          <Section id="overview" title="Overview">
            <p>
              AI Review takes a single pull request and sends it to a panel of three independent AI
              models instead of one. Each model reads the diff on its own, and a finding is only
              surfaced to you once two or more of them agree the same reasoning behind
              multi-reviewer human code review, applied to models.
            </p>
            <p>The review runs in four steps:</p>
            <ol className="ml-5 list-decimal space-y-2">
              <li>
                <strong className="text-foreground">Webhook</strong> the API receives a GitHub PR
                event for any repository you&apos;ve activated.
              </li>
              <li>
                <strong className="text-foreground">Queue</strong> the job is handed to a background
                queue so the webhook response never times out.
              </li>
              <li>
                <strong className="text-foreground">Panel review</strong> your three selected models
                each analyze the diff in parallel, then cross-check each other&apos;s findings.
              </li>
              <li>
                <strong className="text-foreground">Verdict</strong> a summary comment and a GitHub
                check run are posted back to the pull request.
              </li>
            </ol>
            <p>
              The frontend is a Next.js app that authenticates with GitHub OAuth, and the backend is
              a NestJS service that owns the webhook, queue, and consensus logic. See{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="https://nextjs.org"
                target="_blank"
                rel="noreferrer"
              >
                Next.js
              </a>{' '}
              and{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="https://nestjs.com"
                target="_blank"
                rel="noreferrer"
              >
                NestJS
              </a>{' '}
              for framework docs.
            </p>
          </Section>

          <Section id="features" title="Features">
            <ul className="ml-5 list-disc space-y-3">
              <li>
                <strong className="text-foreground">Review by consensus.</strong> Findings need
                agreement from 2 of 3 models before they&apos;re shown single-model noise stays out
                of your inbox.
              </li>
              <li>
                <strong className="text-foreground">A panel you choose.</strong> Pick any 3 of the
                available models per your account; the same panel reviews every activated repo until
                you change it.
              </li>
              <li>
                <strong className="text-foreground">Per-repo activation.</strong> Turn review on or
                off for individual repositories without touching the others.
              </li>
              <li>
                <strong className="text-foreground">Live review visualization.</strong> While a
                review is running, the dashboard shows the panel working through the diff in real
                time instead of a bare spinner.
              </li>
              <li>
                <strong className="text-foreground">Full debate log.</strong> Every finding can be
                expanded into each agent&apos;s individual verdict, reasoning, and confidence score.
              </li>
              <li>
                <strong className="text-foreground">History across commits.</strong> New commits on
                an already-reviewed PR are re-analyzed, and past findings stay visible grouped by
                commit.
              </li>
            </ul>
          </Section>

          <Section id="api-reference" title="API reference">
            <p>
              The backend exposes a REST API under the NestJS app. Protected routes expect{' '}
              <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs">
                Authorization: Bearer &lt;token&gt;
              </code>
              , where the token is issued by <code>/auth/github/sync</code>.
            </p>

            <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-foreground">
              Auth
            </h3>
            <div className="grid gap-3">
              <Endpoint method="POST" path="/auth/github/sync" auth="Public">
                Exchanges a GitHub OAuth access token for a backend session. Creates or updates the
                user record and returns a signed JWT.
              </Endpoint>
              <Endpoint method="GET" path="/auth/profile" auth="Bearer token">
                Returns the authenticated user&apos;s profile.
              </Endpoint>
            </div>

            <h3 className="pt-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Webhooks
            </h3>
            <div className="grid gap-3">
              <Endpoint method="POST" path="/webhooks/github" auth="Public">
                Receives pull request events directly from GitHub. Verified by the{' '}
                <code>x-github-event</code> header.
              </Endpoint>
              <Endpoint method="POST" path="/webhooks/register/:owner/:repo" auth="Bearer token">
                Activates review for a repository by registering a GitHub webhook.
              </Endpoint>
              <Endpoint method="POST" path="/webhooks/unregister/:owner/:repo" auth="Bearer token">
                Deactivates review and removes the webhook.
              </Endpoint>
            </div>

            <h3 className="pt-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Reviewer
            </h3>
            <div className="grid gap-3">
              <Endpoint method="POST" path="/reviewer/analyze" auth="Bearer token">
                Triggers a panel review for a specific PR diff and model set.
              </Endpoint>
              <Endpoint method="GET" path="/reviewer/analysis/:id" auth="Bearer token">
                Fetches a single analysis by ID, including its findings.
              </Endpoint>
              <Endpoint
                method="GET"
                path="/reviewer/repo/:repoName/pr/:prNumber/analysis"
                auth="Bearer token"
              >
                Returns the latest analysis for a pull request.
              </Endpoint>
              <Endpoint
                method="GET"
                path="/reviewer/repo/:repoName/pr/:prNumber/history"
                auth="Bearer token"
              >
                Returns every analysis ever run for a pull request, newest first.
              </Endpoint>
              <Endpoint
                method="GET"
                path="/reviewer/repo/:repoName/pr/:prNumber/status"
                auth="Public"
              >
                Lightweight status check current state, model set, and timestamp only.
              </Endpoint>
              <Endpoint method="GET" path="/reviewer/settings" auth="Bearer token">
                Returns the current user&apos;s selected 3-model panel.
              </Endpoint>
              <Endpoint method="PATCH" path="/reviewer/settings" auth="Bearer token">
                Updates the selected panel. Expects exactly 3 model IDs.
              </Endpoint>
              <Endpoint method="GET" path="/reviewer/active-repos" auth="Bearer token">
                Lists repositories with review currently activated.
              </Endpoint>
            </div>
          </Section>

          <Section id="contributing" title="Contributing">
            <p>This is an npm-workspaces monorepo: the web app and API are separate workspaces.</p>
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-4 font-mono text-xs text-foreground/80">
              {`git clone https://github.com/Kishor-git22/ai-reviewer.git
npm install

cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:3001`}
            </pre>
            <p>Before opening a pull request:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                Run{' '}
                <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs">
                  npm run lint
                </code>{' '}
                and{' '}
                <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs">
                  npm run typecheck
                </code>{' '}
                from the repo root.
              </li>
              <li>
                Keep commits focused one logical change per commit, written in the imperative mood.
              </li>
              <li>
                Describe the <em>why</em> behind a change in the PR description, not just the what.
              </li>
              <li>Add or update tests for any behavior change in the API.</li>
            </ul>
            <p>
              Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier automatically on staged
              files.
            </p>
          </Section>

          <Section id="code-of-conduct" title="Code of conduct">
            <p>
              We want this to be a welcoming project to contribute to. Everyone participating
              maintainers, contributors, and anyone filing an issue is expected to:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Be respectful of differing viewpoints and experience levels.</li>
              <li>Give and accept constructive feedback gracefully.</li>
              <li>Focus criticism on the code and the idea, never the person.</li>
              <li>
                Refrain from harassment, discriminatory language, or personal attacks of any kind.
              </li>
            </ul>
            <p>
              Instances of unacceptable behavior may be reported to the maintainers at{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="mailto:kishora.2204@gmail.com"
              >
                kishora.2204@gmail.com
              </a>
              . All reports will be reviewed and investigated promptly and fairly. This project
              follows the spirit of the{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="https://www.contributor-covenant.org"
                target="_blank"
                rel="noreferrer"
              >
                Contributor Covenant
              </a>
              .
            </p>
          </Section>
        </main>
      </div>
    </div>
  )
}
