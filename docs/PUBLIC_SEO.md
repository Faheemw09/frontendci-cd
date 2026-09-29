# Public SEO for clinic pages

## Flag: Vite SPA alone is not SEO-indexable

The patient React app (`frontend/`, Vite) is a **client-rendered SPA**. Crawlers that do not execute JS reliably will see an empty `#root` shell on `/` and `/clinics/:slug`. That is fine for logged-in booking/account flows, but **not** for a public clinic directory that should rank in search.

## MVP approach (shipped)

Express serves **lightweight HTML** for crawlers and link sharing:

| URL | Purpose |
|-----|---------|
| `GET /public/clinics` | Indexable directory |
| `GET /public/clinics/:slug` | Clinic profile (doctors, address, map iframe, JSON-LD) |
| `GET /public/sitemap.xml` | Sitemap |
| `GET /public/robots.txt` | Crawl rules |

The interactive SPA still lives on the Vite origin (`PUBLIC_SITE_URL`, default `http://localhost:5173`) for browse UX, booking, and patient account.

Env:

- `PUBLIC_SITE_URL` — SPA base (booking CTAs from SSR HTML)
- `API_PUBLIC_URL` — API base used in canonical URLs / sitemap (default `http://localhost:4000`)

## Later options (if SEO needs grow)

1. **Vike** (formerly vite-plugin-ssr) — SSR/SSG inside the Vite React app  
2. **Separate prerender** — crawl public routes at build time (`vite-plugin-ssr` / `react-snap` / custom)  
3. **Astro or Next** for marketing/directory only; keep SPA for authenticated booking  

Do **not** rely on the SPA alone for indexable clinic landing pages without one of the above.
