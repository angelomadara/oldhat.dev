# oldhat.dev — Static Site

Pure static HTML/CSS site served directly by Nginx at [oldhat.dev](https://oldhat.dev). No build step, no runtime dependencies, no PM2 process.

The API backend lives in a separate repository: [`api-oldhat-dev`](https://github.com/angelomadara/api-oldhat-dev).

## Architecture

```
Browser → Cloudflare → Nginx
                         ├── /            → public/index.html
                         ├── /threat/     → public/threat/index.html
                         ├── /assets/*    → public/assets/*
                         └── /api/*       → proxy_pass http://localhost:3001
```

The pages are static shells. Each one fetches a server-rendered HTML fragment from
the API and swaps it into its container — no client-side templating, no build step.

## Files

```
public/
├── index.html              # Overview: summary cards + links to every section
├── threat/index.html       # 🛡️ Threat Intelligence
├── top-ips/index.html      # 🌐 Top IPs
├── bots/index.html         # 🤖 Bot Breakdown
├── paths/index.html        # 📁 Path Activity
├── status-codes/index.html # 📊 Status Code Distribution
├── hourly/index.html       # ⏰ Hourly Activity
├── about/index.html        # ℹ️ About — what it is, how classification works
├── assets/
│   ├── site.css            # Shared stylesheet (light + dark theme)
│   ├── site.js             # Shared Alpine.js logic (theme, date, fetch, SSE)
│   ├── alpine.min.js       # Vendored Alpine 3.14.9 — no CDN dependency
│   ├── favicon.svg         # Icon (+ favicon.ico, apple-touch-icon.png)
│   └── og-image.png        # 1200x630 social card
├── 404.html                # Self-contained 404 page
├── robots.txt              # Crawler policy + sitemap reference
├── sitemap.xml             # All eight URLs
└── .well-known/
    └── security.txt        # Security contact info
```

## Report pages

Every section page shares one Alpine.js component, `dashboard(section)`, defined in
`assets/site.js`. The argument selects which API fragment the page loads.

| Page | `dashboard()` key | Fragment endpoint |
|------|-------------------|-------------------|
| `/` | `null` | `/api/v1/statistics/html/summary` |
| `/threat/` | `threat` | `/api/v1/statistics/html/threat` |
| `/top-ips/` | `topIps` | `/api/v1/statistics/html/top-ips` |
| `/bots/` | `bots` | `/api/v1/statistics/html/bots` |
| `/paths/` | `paths` | `/api/v1/statistics/html/paths` |
| `/status-codes/` | `status` | `/api/v1/statistics/html/status` |
| `/hourly/` | `hourly` | `/api/v1/statistics/html/hourly` |
| `/about/` | `about` | — (static page, no fragment) |

All fragment endpoints accept `?date=YYYY-MM-DD`; the overview page also calls
`/api/v1/health` for the status dot.

### Front-end behaviour

- **Shared assets** — `assets/site.css` and `assets/site.js` are loaded by every page.
  `site.js` is loaded with `defer` *before* the Alpine bundle so `dashboard()` and the
  saved theme exist before Alpine initialises.
- **Theme** — the `.dark` class is applied to `<html>` by `site.js` before first paint,
  avoiding a light-theme flash. The choice persists in `localStorage`.
- **Date** — the selected date is kept in `sessionStorage`, so moving between section
  pages keeps the same day without leaking a stale date into a later visit.
- **Live mode** — the *Go Live* button opens an `EventSource` against
  `/api/v1/statistics/sse?date=…`. On `{"type":"update"}` the page re-fetches its own
  fragment. The browser reconnects automatically; only *Stop Live* closes the stream.
- **SEO** — each page carries unique `<title>`, description, Open Graph, canonical and
  breadcrumb JSON-LD tags, plus a static `<h1>` and explainer text that crawlers can
  read without executing JavaScript.

## Search engines

- `robots.txt` allows `User-agent: *`, so Googlebot and Bingbot are welcome. The
  `Google-Extended` disallow only affects Gemini/AI training — it does **not**
  affect Google Search ranking or indexing.
- Every page carries a unique title, description, canonical and Open Graph image,
  plus a `@graph` JSON-LD block (WebSite / WebPage / BreadcrumbList / AboutPage).
- `sitemap.xml` lists all eight URLs and is referenced from `robots.txt`.
- Each page's `<h1>` and explainer text are static HTML, so they are readable
  without JavaScript. The live figures are fetched at runtime and are not
  indexable — that is deliberate.
- The site still needs registering in Google Search Console and Bing Webmaster
  Tools, with `https://oldhat.dev/sitemap.xml` submitted. Without that there is no
  visibility into indexing status or the queries the site actually ranks for.

## Nginx

Nginx serves files directly from `~/Github/oldhatdev/public/` with:

- HSTS, X-Frame-Options, X-Content-Type-Options headers
- Sensitive path blocking (`.git`, `.env`, etc.)
- Rate limiting
- SSL via Let's Encrypt / Certbot

The directory URLs (`/threat/`, `/top-ips/`, …) rely on the existing `index index.html;`
and `try_files $uri $uri/ =404;` directives — no config change is needed for the
section pages. `/threat` without a trailing slash is redirected to `/threat/` by Nginx.

The SSE endpoint needs proxy buffering disabled so events are pushed immediately:

```nginx
location /api/v1/statistics/sse {
    limit_conn sse_limit 2;          # zone: limit_conn_zone $binary_remote_addr zone=sse_limit:10m;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 24h;
    proxy_pass http://localhost:3001;
}
```

## API Access

The API is available at:

- `https://api.oldhat.dev/v1/*` — primary, clean
- `https://oldhat.dev/api/v1/*` — legacy fallback

See the [api-oldhat-dev](https://github.com/angelomadara/api-oldhat-dev) repository for API documentation.
