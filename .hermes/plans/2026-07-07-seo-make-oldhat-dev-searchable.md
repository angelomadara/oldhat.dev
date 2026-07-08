# oldhat.dev SEO — Make the Site Searchable

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make oldhat.dev rankable and indexable by search engines — visible content, proper meta, structured data, sitemap, and social previews.

**Architecture:** The site is a single Alpine.js SPA (`public/index.html`) served by Nginx + Cloudflare. Search engines cannot execute Alpine.js async API fetches, so all meaningful data is invisible to crawlers. We fix this by adding static indexable content directly in the HTML, not via JS.

**Tech Stack:** HTML5, JSON-LD structured data, Open Graph protocol, Alpine.js (unchanged)

---

## Phase 1: Meta & Social — Quick Wins (5 min)

### Task 1: Replace the `<p>` tagline with a proper `<h1>` hero section

**Objective:** Give crawlers a real heading with keyword-rich descriptive text

**Files:**
- Modify: `public/index.html:423-425`

**Step 1: Replace the tagline**

Find this block:
```html
<p style="margin: -8px 0 16px; font-size: 13px; color: var(--muted); line-height: 1.5">
  Daily Nginx traffic analysis — human vs bot activity, attacker reconnaissance
  patterns, geographic origins, threat category breakdowns ...
  and multi-domain coverage (oldhat.dev + api.oldhat.dev).
</p>
```

Replace with (styled `<h1>` + supporting `<p>`, both static text):

```html
<h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.3">
  oldhat.dev — live Nginx attack log dashboard
</h1>
<p style="margin: 0 0 16px; font-size: 13px; color: var(--muted); line-height: 1.5">
  Real-time traffic analysis showing human visitors, bot crawlers, and automated attacks
  against a personal server. Every request is classified by threat category — .git probing,
  credential theft (.env), WordPress scans, SQL injection attempts, admin brute-force, and
  configuration leaks. Geographic origins, hourly traffic heatmaps, and multi-domain
  coverage (oldhat.dev + api.oldhat.dev). Updated every 30 seconds from live Nginx logs.
  Built with Alpine.js, FastAPI, and MySQL.
</p>
```

**Step 2: Verify the hero renders as static HTML (no Alpine/x-data dependency)**

Run: `grep -c 'x-text\|x-data\|x-init\|x-model\|x-html\|x-show' public/index.html | head -3`
Expected: the hero `<h1>` and `<p>` are NOT inside any Alpine directive — they're plain HTML visible to curl without JS.

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(seo): add h1 hero section with keyword-rich descriptive text"
```

---

### Task 2: Add Open Graph + Twitter Card meta tags

**Objective:** Control how the site previews when shared on Twitter/X, Telegram, Discord, Slack

**Files:**
- Modify: `public/index.html:6-14`

**Step 1: Insert OG/Twitter tags in `<head>` after the existing `<meta description>`**

Open: `public/index.html`

Add these between the `<meta name="description">` and the Alpine.js `<script>`:

```html
    <meta property="og:title" content="oldhat.dev — live Nginx attack log dashboard" />
    <meta property="og:description" content="Real-time traffic analysis: human visitors, bot crawlers, and automated attacks classified by threat category. Geographic origins, hourly heatmaps, and live Nginx log monitoring." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://oldhat.dev/" />
    <meta property="og:site_name" content="oldhat.dev" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="oldhat.dev — live Nginx attack log dashboard" />
    <meta name="twitter:description" content="See every bot, scanner, and SQLi probe hitting a real server. Updated every 30 seconds." />
    <link rel="canonical" href="https://oldhat.dev/" />
```

**Step 2: Verify tags appear in crawl**

Run: `curl -s https://oldhat.dev/ | grep -E 'og:|twitter:|canonical'`
Expected: 8 lines of meta tags showing

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(seo): add OG / Twitter Card / canonical tags"
```

---

### Task 3: Add JSON-LD structured data (WebSite + Dashboard)

**Objective:** Tell Google explicitly what this site is via schema.org structured data

**Files:**
- Modify: `public/index.html` (insert JSON-LD in `<head>`)

**Step 1: Insert JSON-LD block after OG tags, before Alpine.js script**

```html
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "oldhat.dev",
      "url": "https://oldhat.dev/",
      "description": "Live Nginx attack log dashboard showing real-time bot and human traffic, threat intelligence, and geographic attack origins.",
      "about": {
        "@type": "Thing",
        "name": "Nginx access log analysis",
        "description": "Real-time classification of HTTP requests into human, bot, and threat categories including .git probing, credential theft, WordPress scanning, SQL injection, admin brute-force, and configuration leak detection."
      },
      "author": {
        "@type": "Person",
        "name": "Oleg"
      },
      "keywords": [
        "nginx log analysis", "bot detection", "threat intelligence",
        "server monitoring", "attack dashboard", "web security",
        "real-time traffic analysis", "honeypot dashboard"
      ]
    }
    </script>
```

**Step 2: Validate JSON is parseable**

Run: `curl -s https://oldhat.dev/ | grep -A20 'application/ld+json' | head -25 | python3 -c "import sys,json; json.loads(sys.stdin.read().split('</script>')[0].strip()); print('Valid JSON-LD ✓')"`
Expected: `Valid JSON-LD ✓`

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(seo): add JSON-LD structured data (WebSite schema)"
```

---

## Phase 2: Indexable Static Content (10 min)

### Task 4: Add a static "About" footer (always visible, no JS dependency)

**Objective:** Give search engines 150-250 words of unique, indexable text that explains the project. Placed above the existing footer, always rendered regardless of Alpine.js loading state.

**Files:**
- Modify: `public/index.html:396-408` (before the closing `</body>` / footer)

**Step 1: Add an `<aside class="about-section">` before the footer**

Open: `public/index.html`. Find the `<footer>` element near the bottom.

Insert a static about section right before it:

```html
      <!-- ── About (static, indexable by search engines) ── -->
      <div style="margin: 32px 0 16px; padding-top: 24px; border-top: 1px solid var(--border)">
        <h2 style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">About oldhat.dev</h2>
        <div style="font-size: 13px; color: var(--muted); line-height: 1.7">
          <p style="margin-bottom: 8px">
            oldhat.dev is a personal project that exposes a live view of every HTTP request hitting a
            real server on the public internet. An Nginx access log harvester (<code>nginx-watcher.py</code>)
            tails two domains in real time, deduplicates by SHA256 hash, enriches each request with GeoIP
            country data, and classifies user-agents as human or bot. Paths are categorised into threat
            classes — .git directory traversal, .env credential theft, WordPress vulnerability scanning,
            SQL injection attempts, admin panel brute-force, and configuration file leaks.
          </p>
          <p style="margin-bottom: 8px">
            Every 30 seconds the harvester flushes to a MySQL database (socrates) across six normalized
            tables. A daily Python script generates a Telegram summary with trend arrows, hour-bar
            heatmaps, and traffic breakdowns. The FastAPI backend serves this data to the Alpine.js
            frontend you're viewing now, and the full history is browsable by date.
          </p>
          <p style="margin-bottom: 8px">
            The code is open-source and the goal is simple: show exactly what attacks a typical
            internet-facing server faces every second — no filters, no sanitised demo data, just
            the raw reality of the modern web.
          </p>
          <p>
            📬 <a href="https://github.com/oldhat" style="color: var(--accent); text-decoration: none;">GitHub</a>
            · 🖥️ API: <code style="font-size: 12px; background: var(--border); padding: 1px 6px; border-radius: 4px;">api.oldhat.dev</code>
          </p>
        </div>
      </div>
```

**Step 2: Verify the section is static (visible via curl, no x-data dependency)**

Run: `curl -s https://oldhat.dev/ | grep -c 'About oldhat.dev'`
Expected: `1`

**Step 3: Verify the page still functions (Alpine.js not broken)**

Run: Check that no Alpine directives are inside the about section. The about section uses plain HTML only — confirm: `grep -n 'x-' public/index.html | grep -i about` should return nothing.

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(seo): add static about section with indexable project description"
```

---

### Task 5: Add sitemap.xml + reference it in robots.txt

**Objective:** Tell search engines which URLs exist and how often they change

**Files:**
- Create: `public/sitemap.xml`
- Modify: `public/index.html:6-14` (add `<link rel="sitemap">` optional)

**Step 1: Create `public/sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://oldhat.dev/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Step 2: Add sitemap reference to robots.txt (append after Cloudflare block)**

Create `public/robots.txt` (or modify existing if served from filesystem). Since the current robots.txt is served by Cloudflare, not the filesystem, we need to check where it comes from.

Actually — the robots.txt returned 200 but there's no `public/robots.txt` file. Let me verify.

Check: `ls ~/Github/oldhatdev/public/robots.txt 2>/dev/null || echo "No file"`
If no file, robots.txt is coming from Cloudflare config. We can either:
a) Create a local `public/robots.txt` that nginx serves instead — will override Cloudflare
b) Add sitemap line via Cloudflare dashboard

Simplest: Create local `public/robots.txt` with Cloudflare's managed rules + our sitemap reference appended.

```txt
# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
# use:      how AI systems may consume the content (immediate, reference, or full).

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

# END Cloudflare Managed Content

Sitemap: https://oldhat.dev/sitemap.xml
```

**Step 3: Verify sitemap is accessible**

Run: `curl -s https://oldhat.dev/sitemap.xml | head -5`
Expected: Valid XML with `<loc>https://oldhat.dev/</loc>`

**Step 4: Verify robots.txt is accessible + has sitemap ref**

Run: `curl -s https://oldhat.dev/robots.txt | grep -i sitemap`
Expected: `Sitemap: https://oldhat.dev/sitemap.xml`

**Step 5: Commit**

```bash
git add public/sitemap.xml public/robots.txt
git commit -m "feat(seo): add sitemap.xml and update robots.txt with sitemap reference"
```

---

### Task 6: Submit to Google Search Console

**Objective:** Tell Google to index the site and monitor for issues

**Step 1: Verify the site is accessible to Googlebot**

Run: `curl -s -I -H "User-Agent: Googlebot/2.1" https://oldhat.dev/ | head -20`
Expected: HTTP/2 200, no `X-Robots-Tag: noindex`

**Step 2: Submit via Google Search Console URL inspection**

Manual step (needs Oleg's Google account):
1. Go to https://search.google.com/search-console
2. Add property: `https://oldhat.dev/`
3. Verify ownership (DNS TXT record or Cloudflare integration — Cloudflare makes this one-click)
4. Request indexing of the homepage
5. Submit sitemap: paste `https://oldhat.dev/sitemap.xml`

**Step 3: Check Cloudflare caching**

Cloudflare caches HTML by default. Ensure that changes to `index.html` are reflected promptly:
- Option A: Set a short browser cache TTL for HTML in Cloudflare Page Rules
- Option B: Purge cache manually after deploying (`curl -X POST https://api.cloudflare.com/.../purge_cache`)

---

## Acceptance Criteria

| # | Check | Verification |
|---|-------|-------------|
| 1 | `<h1>` hero visible via curl (no JS) | `curl -s https://oldhat.dev/ \| grep '<h1'` returns content |
| 2 | OG/Twitter tags present | `curl -s https://oldhat.dev/ \| grep -E 'og:\|twitter:'` returns 8+ lines |
| 3 | JSON-LD valid | `curl -s https://oldhat.dev/ \| grep -A20 'ld+json' \| python3 -c "..."` passes |
| 4 | Static about section indexed | `curl -s https://oldhat.dev/ \| grep 'About oldhat.dev'` returns 1 |
| 5 | Sitemap accessible + valid XML | `curl -s https://oldhat.dev/sitemap.xml \| xmllint --noout -` returns no errors |
| 6 | robots.txt includes sitemap URL | `curl -s https://oldhat.dev/robots.txt \| grep Sitemap` returns URL |
| 7 | Page loads normally in browser | Visual check — no blank page, no JS errors |
| 8 | Console Easter egg still works | Open DevTools → console → styled message appears |

---

## Verification Sequence (full regression)

```bash
# 1. Crawl sim
curl -s -H "User-Agent: Googlebot/2.1" https://oldhat.dev/ | grep -E '<h1|<title|<meta|description|about|sitemap'

# 2. Structured data
curl -s https://oldhat.dev/ | grep -A20 'ld+json' | python3 -c "
import sys, json, re
text = sys.stdin.read()
m = re.search(r'({.*?})</script>', text, re.DOTALL)
if m: json.loads(m.group(1)); print('JSON-LD valid ✓')
else: print('JSON-LD not found ✗')
"

# 3. Social preview tags
curl -s https://oldhat.dev/ | grep -c 'og:'  # should be >= 4
curl -s https://oldhat.dev/ | grep -c 'twitter:' # should be >= 3

# 4. Sitemap
curl -s -o /dev/null -w '%{http_code}' https://oldhat.dev/sitemap.xml  # should be 200
