# AGENTS.md

Project: **PACEMAKER / Gradlae** — AI-powered academic planning platform (Next.js 16, Supabase).

## Cursor Cloud specific instructions

### Git remotes — always push to the fork
- **`origin` must be `GradlaeTestingFork`**, not the upstream Gradlae repo.
- Current fork: `https://github.com/sargonug-ops/GradlaeTestingFork`
- All `git push` commands should target this fork (`git push -u origin <branch>`).
- Do **not** add or push to a remote pointing at the original/upstream Gradlae repository unless the user explicitly asks.
- PRs are opened against branches on the fork (e.g. `cursor/degree-planning-integration-ad76`).

Verify before pushing: `git remote get-url origin` should contain `GradlaeTestingFork`.
