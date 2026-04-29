# Prism Web 💎

The frontend for **Prism**, an open-source AI code review platform. Prism takes a single Pull Request and refracts it through three different AI models to provide a high-confidence, multi-perspective analysis.

## 🚀 Overview

- **Landing Page**: Immersive 3D prism visualization with GitHub authentication
- **Dashboard**: Single-page layout with h-screen overflow-hidden for optimal PR review experience
- **Refracted Consensus**: Findings are marked "Confirmed" only when 2+ AI agents agree
- **Agent Debate**: View raw reasoning from all 3 models (Llama, Nemotron, Mixtral) via Sheet drawer
- **User Control**: Custom model selection (pick 3 of 7 NVIDIA models)

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components by default)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Auth**: [NextAuth.js v5 (Beta)](https://authjs.dev/) (GitHub Provider - only scrapes `user.login` and `user.image`)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **3D Visuals**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Drei](https://github.com/pmndrs/drei)

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/landing/       # Immersive 3D login page
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx      # PR list view
│   │   │   └── settings/     # Model selection settings
│   │   └── layout.tsx        # Dashboard layout with sidebar
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts          # NextAuth API route
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home (redirects to dashboard if authenticated)
│   ├── providers.tsx         # QueryClient + SessionProvider
│   └── globals.css           # Tailwind + CSS variables
├── components/
│   ├── canvas/
│   │   └── HeroPrism.tsx     # R3F 3D prism component
│   ├── dashboard/
│   │   ├── Sidebar.tsx       # shadcn/ui sidebar navigation
│   │   ├── AnalysisView.tsx  # PR analysis with findings
│   │   └── AgentDebateLog.tsx # Sheet drawer for agent reasoning
│   └── ui/                   # shadcn/ui components
├── hooks/
│   ├── usePrAnalysis.ts      # TanStack Query hooks for PR data
│   └── use-mobile.tsx        # Mobile detection hook
├── lib/
│   ├── auth.ts               # NextAuth v5 configuration
│   ├── data.ts               # Mock data (NVIDIA models, PRs, findings)
│   └── utils.ts              # Utility functions (cn, color helpers)
└── types/
    └── index.ts              # TypeScript interfaces
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

4. **Open**: http://localhost:3000

## 🔑 Key Features Implemented

### 1. Refracted Consensus UI

Findings are flagged as "Confirmed" only if 2+ agents agree. The `AnalysisView` component separates findings into:

- **Confirmed Findings**: 2+ agents agree (green badge)
- **Single Agent Findings**: Only 1 agent identified (yellow badge)

### 2. Single-Page Constraint

The dashboard uses `h-screen overflow-hidden` layout:

- `@/app/(dashboard)/layout.tsx`: `h-screen overflow-hidden flex`
- `@/components/dashboard/AnalysisView.tsx`: `h-full flex flex-col` with `ScrollArea`
- No scrolling on the main layout - only content areas scroll

### 3. Agent Debate Log

The `AgentDebateLog` component uses a shadcn/ui Sheet (side drawer) to display:

- Each agent's verdict (Agreed/Disagreed/Uncertain)
- Confidence scores with visual bars
- Raw reasoning text from each model
- Consensus summary (count of each verdict type)

### 4. 3D Hero Prism

The `HeroPrism` component in `@/components/canvas/HeroPrism.tsx`:

- Uses React Three Fiber for WebGL rendering
- Creates a triangular prism with glass-like material
- Includes floating particles around the prism
- Auto-rotating animation with contact shadows

## 🎨 Design System

The project uses a dark theme with CSS variables:

- Background: `hsl(222 47% 4%)` - Deep slate
- Primary: `hsl(217 91% 60%)` - Blue
- Card: `hsl(222 47% 6%)` - Slightly lighter than background
- Border: `hsl(217 33% 17%)` - Subtle borders

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
