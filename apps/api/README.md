# Prism API (ai-reviewer-app) ⚙️

The core engine for **Prism**. This service handles GitHub webhooks, manages the AI review queue, and executes the multi-model consensus logic.

## 🧠 The Consensus Strategy
Unlike standard AI reviewers, Prism runs **3 NVIDIA NIM models** in parallel.
- **Confirmed**: Findings flagged by 2 or more models receive a "High Confidence" badge.
- **Insights**: Disagreements between models are highlighted to show the nuance of the code analysis.

## 🛠 Tech Stack
- **Runtime**: [NestJS 10](https://nestjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via Supabase)
- **Queue**: [BullMQ](https://docs.bullmq.io/) + [Redis](https://redis.io/)
- **AI Integration**: [NVIDIA NIM](https://build.nvidia.com/) (OpenAI-compatible)
- **GitHub API**: [Octokit](https://github.com/octokit/rest.js)

## 🏗 Architecture Flow
1. **Webhook**: Receives PR events from GitHub.
2. **Queue**: Offloads tasks to BullMQ to prevent timeouts.
3. **Worker**: Calls 3 AI models, merges findings, and deduplicates by file/line.
4. **Action**: Posts summary comments and creates a GitHub Check Run.

## 🛠 Getting Started

1. **Clone and Install**:
   ```bash
   git clone [https://github.com/YOUR_USERNAME/ai-reviewer-app.git](https://github.com/YOUR_USERNAME/ai-reviewer-app.git)
   cd ai-reviewer-app
   npm install
