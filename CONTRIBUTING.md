# Contributing to tpt hearth

Thank you for your interest in contributing to `tpt hearth`. This is a calm, intentional project — contributions should reflect its spirit: thoughtful, unhurried, and human-first.

## Before you begin

Read [SPEC.md](./SPEC.md) to understand the product principles. `tpt hearth` permanently rejects algorithmic feeds, engagement metrics, virality, and extractive design. Contributions that introduce these patterns will not be accepted, regardless of technical quality.

## What we welcome

- Bug fixes
- Accessibility improvements
- Internationalisation (i18n) support
- Performance improvements that don't compromise simplicity
- Security hardening
- Documentation improvements
- New features that align with the product vision (discuss in an issue first)

## What we will not accept

- Algorithmic recommendations or ranking
- Likes, reposts, follower counts, or engagement metrics
- Advertising, tracking pixels, or analytics integrations
- Infinite scroll or attention-capture patterns
- Anything that undermines the calm, intimate tone of the platform

## Development setup

```sh
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development server
pnpm dev
```

The web app runs at `http://localhost:3000` and the WebSocket server at `ws://localhost:4000`.

## Project structure

```
apps/web/          Next.js 15 App Router web application
packages/config/   Environment constants and app configuration
packages/shared/   Shared TypeScript types, Zod schemas, validators
packages/db/       Drizzle ORM schema, SQLite database layer
packages/crypto/   Web Crypto API utilities for E2E encryption
packages/ui/       Shared React component library
docs/              Architecture, encryption, moderation, deployment docs
```

## Running tests

```sh
pnpm test          # Unit tests (vitest)
pnpm test:e2e      # End-to-end tests (Playwright)
pnpm lint          # ESLint
pnpm build         # TypeScript build check
```

All tests must pass before a pull request will be reviewed.

## Code style

- TypeScript strict mode throughout
- No `any` types
- Zod for all external input validation
- No comments unless the *why* is non-obvious
- Prefer small, focused functions

## Submitting a pull request

1. Open an issue first for any non-trivial change.
2. Fork the repository and create a feature branch.
3. Make your changes with focused, atomic commits.
4. Ensure all tests pass and there are no TypeScript errors.
5. Open a pull request with a clear description of what changed and why.
6. Be patient — this is a calm project, and reviews take time.

## Security

If you discover a security vulnerability, please do **not** open a public issue. Email [phillip@icb.co.nz](mailto:phillip@icb.co.nz) with a description of the issue and steps to reproduce.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).

---

*Come sit. Stay awhile. Just be.*
