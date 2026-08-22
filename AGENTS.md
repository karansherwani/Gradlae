# AGENTS.md

Project: **PACEMAKER / Gradlae** — AI-powered academic planning platform (Next.js 16, Supabase).

## Cursor Cloud specific instructions

### Git remotes — always push to the fork
- **`origin` must be `GradlaeTestingFork`**, not the upstream Gradlae repo.
- Fork URL: `https://github.com/sargonug-ops/GradlaeTestingFork.git`
- All `git push` commands use `git push -u origin <branch>`.
- Do **not** add or push to a remote pointing at the original/upstream Gradlae repository unless the user explicitly asks.
- Remove `upstream` if present so nothing references the main repo.

If remotes look wrong, run:

```bash
git remote -v
git remote set-url origin https://github.com/sargonug-ops/GradlaeTestingFork.git
git remote remove upstream 2>/dev/null || true
git remote set-url --push origin https://github.com/sargonug-ops/GradlaeTestingFork.git
```

Verify before pushing: `git remote get-url origin` and `git remote get-url --push origin` must both contain `GradlaeTestingFork`.
