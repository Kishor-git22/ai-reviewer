<p align="center">
  <img src="apps/web/public/logo.svg" alt="AI Review" height="56" />
</p>

# AI Review

**AI Review** is an open-source AI code review platform. It takes a single pull request and sends
it to three independent AI models at once a finding is only marked **Confirmed** once 2 or more
of them agree.

This repository is an **npm-workspaces monorepo** containing both halves of AI Review:

```
ai-review/
├── apps/
│   ├── web/     # Next.js 15 frontend dashboard, auth, 3D landing page
│   └── api/     # NestJS backend webhooks, AI consensus engine, GitHub auth
└── package.json # workspace root
```

- [apps/web/README.md](apps/web/README.md) frontend setup, tech stack, design system
- [apps/api/README.md](apps/api/README.md) backend setup, API reference, database schema
- [CONTRIBUTING.md](CONTRIBUTING.md) how to propose a change
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) community expectations
- In-app docs live at `/docs` once the web app is running (overview, features, API reference,
  contributing, code of conduct all in one place).

## 🏗 Architecture

1. **Webhook**: `apps/api` receives PR events from GitHub.
2. **Queue**: Offloads review jobs to BullMQ to avoid webhook timeouts.
3. **Panel**: Calls 3 NVIDIA NIM models in parallel, merges findings, dedupes by file/line.
4. **Verdict**: Posts a summary comment and GitHub Check Run back on the PR.
5. **Frontend**: `apps/web` authenticates via GitHub OAuth (NextAuth v5), syncs the user with the
   API, and renders the consensus dashboard confirmed findings, per-finding debate log, and
   per-user model selection.

## 🛠 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or a Supabase project) for the API
- A GitHub OAuth App (shared client ID/secret used by both the frontend's NextAuth flow and the
  backend's GitHub API calls)

### Install

From the repo root (installs both workspaces with a single lockfile):

```bash
npm install
```

### Environment variables

Each app has its own env file:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

See each app's README for the required variables.

### Run in development

```bash
npm run dev:web   # Next.js dev server http://localhost:3000
npm run dev:api   # NestJS dev server http://localhost:3001 (auto-restarts, frees its port)
```

Run both in separate terminals.

### Common workspace scripts

| Command                                                  | Description                  |
| -------------------------------------------------------- | ---------------------------- |
| `npm run build`                                          | Build both apps              |
| `npm run build:web` / `npm run build:api`                | Build a single app           |
| `npm run lint` / `npm run lint:web` / `npm run lint:api` | Lint                         |
| `npm run format` / `npm run format:check`                | Prettier, all/one app        |
| `npm run typecheck`                                      | `tsc --noEmit` for both apps |
| `npm run test`                                           | Backend unit tests (Jest)    |

Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier on staged files, scoped to
whichever app they belong to.

## 🚀 Deployment

`apps/web` and `apps/api` deploy independently. On Vercel, create one project per app and set its
**Root Directory** to `apps/web` or `apps/api` respectively each already has its own
`next.config.js` / `vercel.json` and build script.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.
