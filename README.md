# oldhat.dev — Static Site

Pure static HTML/CSS site served directly by Nginx at [oldhat.dev](https://oldhat.dev). No build step, no runtime dependencies, no PM2 process.

The Express API backend lives in a separate repository: [`~/Github/api-oldhat-dev`](https://github.com/angelomadara/api-oldhat-dev).

## Architecture

```
Browser → Cloudflare → Nginx
                         └── oldhat.dev/ → /home/ubuntu/Github/oldhatdev/public/
```

## Files

```
public/
├── index.html            # Landing page (CSS inlined in <style>)
└── .well-known/
    └── security.txt      # Security contact info
```

## Nginx

Nginx serves files directly from `~/Github/oldhatdev/public/` with:
- HSTS, X-Frame-Options, X-Content-Type-Options headers
- Sensitive path blocking (`.git`, `.env`, etc.)
- Rate limiting
- SSL via Let's Encrypt / Certbot

## API Access

The API is available at:
- `https://api.oldhat.dev/v1/*` — primary, clean
- `https://oldhat.dev/api/v1/*` — legacy fallback

See the [api-oldhat-dev](https://github.com/angelomadara/api-oldhat-dev) repository for API documentation.
