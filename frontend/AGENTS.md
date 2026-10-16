<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep SecStudio as one desktop IDE workspace at the index route with focused panel modules; tools are workspace views, not disconnected dashboard pages.
- Use Monaco in a lazy browser-only module with a normal filename with bundled workers; SSR must not evaluate the editor engine.
- Model security scans, AI replies, terminal commands and account connections as explicitly labeled frontend demonstrations until real services are connected.
- Persist workspace layout, files, tabs and editor preferences locally after hydration; this is device-local UI state, not server data.
