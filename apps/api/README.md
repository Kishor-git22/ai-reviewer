# Prism API (ai-reviewer-app) ⚙️

The core engine for **Prism**. This service handles GitHub webhooks, manages the AI review queue, executes the multi-model consensus logic, and provides secure user authentication.

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
- **GitHub API**: [Octokit](https://github.com/octokit/rest.js) / Axios
- **Auth**: JWT with Passport.js

## 🔐 GitHub Auth & Profile Sync

This backend implements a secure "handshake" pattern for GitHub authentication:

### Architecture Flow
1. **Frontend**: Next.js + NextAuth.js v5 authenticates with GitHub OAuth
2. **Sync**: Frontend sends GitHub `accessToken` to backend
3. **Verify**: Backend fetches user profile from GitHub API
4. **Upsert**: Backend creates or updates user in PostgreSQL
5. **JWT**: Backend issues custom JWT for subsequent requests

### API Endpoints

#### POST `/auth/github/sync`
Accepts GitHub access token from frontend and returns backend JWT.

**Request:**
```json
{
  "accessToken": "gho_xxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "githubId": "12345",
      "username": "octocat",
      "avatarUrl": "https://avatars.githubusercontent.com/...",
      "email": "octocat@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbG..."
  }
}
```

#### GET `/auth/profile`
Protected route returning current user's profile. Requires `Authorization: Bearer <token>` header.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "githubId": "12345",
      "username": "octocat",
      "avatarUrl": "https://avatars.githubusercontent.com/...",
      "email": "octocat@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Database Schema

```prisma
model User {
  id         String   @id @default(uuid()) @db.Uuid
  githubId   String   @unique
  username   String
  avatarUrl  String
  email      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Security Features
- JWT tokens with configurable expiration (default: 7 days)
- Bearer token authentication via Passport.js
- `JwtAuthGuard` for protecting routes
- `@GetUser()` decorator for easy access to current user
- CORS configured for frontend integration

## 🏗 Architecture Flow
1. **Webhook**: Receives PR events from GitHub.
2. **Queue**: Offloads tasks to BullMQ to prevent timeouts.
3. **Worker**: Calls 3 AI models, merges findings, and deduplicates by file/line.
4. **Action**: Posts summary comments and creates a GitHub Check Run.

## 🛠 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Supabase account)
- GitHub OAuth App credentials

### 1. Clone and Install
```bash
cd ai-reviewer-app
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required variables:**
```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/ai_reviewer?schema=public"

# JWT (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="7d"

# Server
PORT=3001
NODE_ENV=development
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Start Development Server
```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
ai-reviewer-app/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts    # Auth endpoints
│   │   ├── auth.module.ts        # Auth module config
│   │   ├── auth.service.ts       # GitHub sync + JWT logic
│   │   ├── dto/
│   │   │   └── github-sync.dto.ts
│   │   ├── decorators/
│   │   │   ├── get-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── users/
│   │   ├── users.module.ts       # Users module
│   │   └── users.service.ts      # User DB operations
│   ├── prisma/
│   │   ├── prisma.module.ts      # Global Prisma module
│   │   └── prisma.service.ts     # Prisma client
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application entry
└── package.json
```

## 🧪 Testing the Auth Flow

### 1. Sync GitHub User
```bash
curl -X POST http://localhost:3001/auth/github/sync \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "your_github_access_token"}'
```

### 2. Get Profile (Protected)
```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer your_jwt_token"
```

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL="postgresql://..."  # Use connection pooling
JWT_SECRET="very-long-random-secret-min-32-chars"
JWT_EXPIRATION="7d"
```

### Build and Start
```bash
npm run build
npm run start:prod
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

## 📝 License

MIT License - see LICENSE file for details.
