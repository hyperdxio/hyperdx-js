---
description:
  Fetch a Linear ticket, implement the fix/feature, test, commit, push, and
  raise a PR
---

Look up the Linear ticket $ARGUMENTS. Read the ticket description, comments, and
any linked resources thoroughly.

## Phase 1: Understand the Ticket

- Summarize the ticket — what is being asked for (bug fix, feature, refactor,
  etc.)
- Identify acceptance criteria or expected behavior from the description
- Note any linked issues, related tickets, or dependencies
- Identify which package(s) under `packages/` are likely affected (e.g.
  `node-opentelemetry`, `browser`, `instrumentation-exception`)

If the ticket description is too vague or lacks enough information to proceed
confidently, **stop and ask me for clarification** before writing any code.
Explain exactly what information is missing and what assumptions you would need
to make.

## Phase 2: Plan and Implement

Before writing code, read `AGENTS.md` at the repo root to understand the
monorepo layout, build tooling (Yarn workspaces + Nx), and code style
conventions (Prettier, ESLint, `simple-import-sort`, naming).

1. Explore the codebase to understand the relevant code paths and existing
   patterns. Use `npx nx graph` or inspect `packages/*/package.json` to
   understand inter-package dependencies when changes span packages.
2. Create an implementation plan — which package(s) and files to change, what
   approach to take
3. Implement the fix or feature following existing codebase patterns:
   - Single quotes, trailing commas, semicolons (Prettier)
   - Sorted imports (`simple-import-sort`): external packages first, then
     relative imports separated by a blank line
   - Use `import type { ... }` for type-only imports
   - Prefer named exports
   - Use `diag.error/debug` from `@opentelemetry/api` for OTel-internal errors,
     `console.warn` for user-facing warnings
4. Keep changes minimal and focused on the ticket scope
5. If the change is user-facing or modifies a published package, add a
   changeset: `yarn changeset` and commit the generated file under
   `.changeset/`

## Phase 3: Verify

Run lint and type checks, then run the appropriate tests based on which
packages were modified. Nx will only re-run affected targets when caching is
warm, so prefer `nx affected` for speed on large changes.

1. Run `yarn ci:build` to verify all packages build (respects topological
   order via Nx)
2. Run `yarn ci:lint` to verify ESLint + `tsc --noEmit` pass across the
   workspace
3. Run `yarn ci:unit` to verify unit tests pass across all packages

   For a single package, run targeted commands instead:

   ```bash
   cd packages/<pkg> && npx jest
   cd packages/<pkg> && npx jest --testPathPattern="<file>"
   ```

   Note: `otel-web` uses Karma + Mocha (not Jest) — see its `package.json` for
   `test:unit:ci-node` and `test:unit:ci`.
4. If any checks fail, fix the issues and re-run until everything passes

## Phase 4: Commit, Push, and Open PR

1. Create a new branch named `<current-user>/$ARGUMENTS-<short-description>`.
   Use the current git/OS username when available, and use `whoami` as a
   fallback to determine the prefix (e.g.
   `warren/HDX-1234-fix-winston-transport`)
2. Commit the changes using conventional commit format (`feat:`, `fix:`,
   `chore:`, `refactor:`, `docs:`) and reference the ticket ID. The
   pre-commit hook (`husky` + `lint-staged`) will auto-run `prettier --write`
   and `eslint --fix` on staged `.ts`/`.tsx` files.
3. Push the branch to the remote
4. Open a draft pull request with:
   - Title: `[$ARGUMENTS] <description>`. If multiple tickets are being
     addressed, omit the arguments from the title.
   - Body: Include a summary of the change, which package(s) were modified,
     testing notes, and a link to the Linear ticket. Mention whether a
     changeset was added (and the bump type) if the change touches a
     published package.
   - Label: Attach the `ai-generated` label
