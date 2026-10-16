# Kestrel AI Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx`: those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL | Description |
| :--- | :--- | :--- |
| `index.tsx` | `/` | Main Kestrel IDE desktop studio with editor and diagnostic panels |
| `about.tsx` | `/about` | About page and version information |
| `users/index.tsx` | `/users` | User management index |
| `users/$id.tsx` | `/users/:id` | Dynamic user profile (bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` | Optional category segment |
| `files/$.tsx` | `/files/*` | Splat route (read via `_splat` param, never `*`) |
| `_layout.tsx` | Layout route | Renders children via `<Outlet />` |
| `__root.tsx` | App shell | Wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
