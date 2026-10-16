<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history (force pushing, or rebasing/amending/squashing commits
> that are already pushed) as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application Architecture Guidelines
- Keep Kestrel AI as one cohesive desktop IDE workspace at the index route with focused panel modules; tools are workspace views, not disconnected dashboard pages.
- Use Monaco in a lazy browser-only module with bundled workers; SSR must not evaluate the editor engine.
- Integrate frontend components with real backend service endpoints (`/api/internal` for file explorer, terminal, and OAuth; `/api/external` for AST audits, Docker sandbox execution, Nemotron reasoning, and CI/CD generation).
- Persist workspace layout, files, tabs, and editor preferences locally after hydration; this ensures a smooth, uninterrupted developer experience.
