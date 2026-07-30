# AI Review Web

The frontend for **AI Review**, an open-source AI code review platform. AI Review sends a single
pull request to three independent AI models to provide a high-confidence, multi-perspective
analysis.

## 🚀 Overview

- **Landing Page**: 3D "consensus core" visualization (three orbiting agents, one verdict) with
  GitHub authentication
- **Dashboard**: Single-page layout with `h-screen overflow-hidden` for an uninterrupted review
  experience
- **Consensus review**: Findings are marked "Confirmed" only when 2+ AI agents agree
- **Live debate visualization**: While a review runs, the dashboard shows the panel reading the
  diff and debating in near real time instead of a bare spinner
- **Agent Debate Log**: View each model's raw verdict and reasoning per finding via a Sheet drawer
- **User Control**: Custom model selection (pick 3 of the available NVIDIA-hosted models)

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components by default)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Type**: Inter (UI/body) + Fraunces (display/headings)
- **Auth**: [NextAuth.js v5 (Beta)](https://authjs.dev/) (GitHub Provider - only scrapes `user.login` and `user.image`)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **3D Visuals**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Drei](https://github.com/pmndrs/drei)

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/landing/       # 3D login page
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx      # PR list view
│   │   │   └── settings/     # Model selection settings
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   └── loading.tsx       # Route-group suspense fallback
│   ├── docs/                 # Public in-app documentation
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts          # NextAuth API route
│   ├── icon.svg               # Favicon (file-based metadata)
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home (redirects to dashboard if authenticated)
│   ├── providers.tsx           # QueryClient + SessionProvider
│   └── globals.css             # Tailwind + CSS variables
├── components/
│   ├── brand/
│   │   └── Logo.tsx           # Logo mark + wordmark
│   ├── canvas/
│   │   └── HeroScene.tsx      # R3F "consensus core" 3D scene
│   ├── dashboard/
│   │   ├── Sidebar.tsx        # shadcn/ui sidebar navigation
│   │   ├── AnalysisView.tsx   # PR analysis with findings
│   │   ├── DebateArena.tsx    # Live debate visualization for in-progress reviews
│   │   └── AgentDebateLog.tsx # Sheet drawer for agent reasoning
│   └── ui/                    # shadcn/ui components
├── hooks/
│   ├── usePrAnalysis.ts       # TanStack Query hooks for PR data
│   └── use-mobile.tsx         # Mobile detection hook
├── lib/
│   ├── auth.ts                # NextAuth v5 configuration
│   ├── data.ts                # Mock data (NVIDIA models, PRs, findings)
│   └── utils.ts               # Utility functions (cn, semantic color helpers)
└── types/
    └── index.ts                # TypeScript interfaces
```

## 🏗 Getting Started

### Prerequisites

- Node.js 18+
- GitHub OAuth App credentials

### Installation

1. **Clone and Install**:

   ```bash
   cd ai-reviewer-web
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.local.example` to `.env.local` and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:

   ```
   AUTH_SECRET=your-secret-key-here
   AUTH_GITHUB_ID=your-github-client-id
   AUTH_GITHUB_SECRET=your-github-client-secret
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. **Run Development Server**:

   ```bash
   npm run dev
   ```

4. **Open**: http://localhost:3000 (docs at http://localhost:3000/docs)

## 🔑 Key Features Implemented

### 1. Consensus review UI

Findings are flagged as "Confirmed" only if 2+ agents agree. The `AnalysisView` component separates
findings into:

- **Confirmed findings**: 2+ agents agree
- **Single-agent findings**: Only 1 agent identified

### 2. Single-page constraint

The dashboard uses `h-screen overflow-hidden` layout:

- `@/app/(dashboard)/layout.tsx`: `h-screen overflow-hidden flex`
- `@/components/dashboard/AnalysisView.tsx`: `h-full flex flex-col` with `ScrollArea`
- No scrolling on the main layout - only content areas scroll

### 3. Live debate visualization

`DebateArena` renders while an analysis is `in_progress`/`pending`: the three selected agents are
shown exchanging short reasoning lines with a typing indicator and a consensus meter, so waiting
for a review feels like watching a panel work rather than staring at a spinner.

### 4. Agent Debate Log

The `AgentDebateLog` component uses a shadcn/ui Sheet (side drawer) to display, per finding:

- Each agent's verdict (Agreed/Disagreed/Uncertain)
- Confidence scores
- Raw reasoning text from each model
- Consensus summary (count of each verdict type)

### 5. 3D consensus scene

The `HeroScene` component in `@/components/canvas/HeroScene.tsx`:

- Uses React Three Fiber for WebGL rendering
- Renders a faceted core (the PR under review) with three colored nodes (the agents) orbiting it
  on independent paths, tethered by pulsing lines
- Auto-rotating animation with contact shadows and ambient particles

## 🎨 Design System

Warm, near-black dark theme deliberately not the default slate/blue-purple template look:

- Background: `hsl(30 8% 6%)` warm charcoal
- Primary/accent: `hsl(21 82% 56%)` copper/amber, used sparingly as the one signal color
- Card: `hsl(30 9% 8%)`
- Border: `hsl(30 10% 16%)`
- Agent identity colors: `--agent-1` (steel blue), `--agent-2` (muted violet), `--agent-3` (sage)
- Semantic status colors: `--success`, `--warning`, `--destructive`
- Display type: Fraunces (serif) for headings, Inter for UI/body

## 📝 TypeScript Types

Key interfaces in `@/types/index.ts`:

```typescript
interface Finding {
  id: string
  consensus: boolean // True if 2+ agents agree
  status: 'Confirmed' | 'Disputed' | 'SingleAgent'
  agentReasonings: AgentReasoning[] // Raw agent outputs
}

interface AgentReasoning {
  agentId: string
  agentName: string
  verdict: 'positive' | 'negative' | 'neutral'
  reasoning: string
  confidence: number
}
```

## 🔐 Privacy

Per requirements, the GitHub provider only scrapes:

- `user.login` (GitHub username)
- `user.image` (GitHub avatar)

No email or other personal data is collected.

## 📦 Build

```bash
npm run build
```

The build will be output to `.next/` directory.

## 🧪 Type Checking

```bash
npm run typecheck
```

## 🎨 Code Quality

The project uses **Husky** pre-commit hooks and **lint-staged** to ensure code quality:

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run lint`         | Run ESLint on all files        |
| `npm run lint:fix`     | Fix ESLint auto-fixable issues |
| `npm run format`       | Format all files with Prettier |
| `npm run format:check` | Check if files are formatted   |

### Pre-commit Hook

When you commit, Husky automatically runs:

1. **ESLint** with `--fix` on staged `.ts/.tsx/.js/.jsx` files
2. **Prettier** on all staged files

### Configuration

- **ESLint**: `.eslintrc.json` - extends Next.js + Prettier configs
- **Prettier**: `.prettierrc` - 2-space indent, single quotes, no semicolons, Tailwind plugin
- **Husky**: `.husky/pre-commit` - runs `npx lint-staged`
- **lint-staged**: `package.json` - configured in `lint-staged` key

## 📄 License

MIT License - see LICENSE file for details.
