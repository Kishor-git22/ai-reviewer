# Contributing to AI Review

Thanks for taking the time to contribute. This is an npm-workspaces monorepo: the web app
(`apps/web`) and the API (`apps/api`) are independent workspaces that share a single lockfile.

## Getting set up

```bash
git clone https://github.com/Kishor-git22/ai-reviewer.git
cd ai-reviewer
npm install

cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:3001
```

See [apps/web/README.md](apps/web/README.md) and [apps/api/README.md](apps/api/README.md) for the
full list of required environment variables.

## Before opening a pull request

- Run the checks from the repo root: `npm run lint` and `npm run typecheck`.
- Format your changes: `npm run format`.
- Add or update tests for any behavior change in `apps/api` (`npm run test`).
- Keep commits focused one logical change per commit, written in the imperative mood
  (`fix: dedupe agent votes by file+line`, not `fixed bug`).
- Explain the _why_ in the PR description. The diff already shows the what.

Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier automatically on staged files, so
most formatting issues are caught before you even open the PR.

## Reporting bugs

Open an issue with:

1. What you expected to happen.
2. What actually happened.
3. Steps to reproduce, including whether it's reproducible on `apps/web`, `apps/api`, or both.

## Proposing a feature

Open an issue describing the problem first, before the solution it's easier to agree on what's
broken than to review a finished implementation of the wrong fix.

## Code of conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
