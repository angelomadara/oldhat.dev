/* ─────────────────────────────────────────────────────────────
   oldhat.dev — shared front-end logic
   Loaded by every page with `defer`, BEFORE the deferred Alpine
   bundle, so `window.dashboard` and the saved theme exist by the
   time Alpine initialises `x-data="dashboard('...')"`.
   ───────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var THEME_KEY = "theme";
  var DATE_KEY = "oldhat.date";

  /* API base path.
     Same-origin RELATIVE path on purpose — NOT https://api.oldhat.dev —
     because the host nginx reverse-proxies /api/* to the FastAPI backend
     (stripping the /api prefix), which keeps every request same-origin and
     avoids CORS preflight entirely. If that nginx rule ever changes, every
     URL below breaks at once; this constant is the single place to look.
     Every API/SSE/health URL must derive from this constant. */
  var API_BASE = "/api/v1";

  /* HTML fragment endpoints, rendered server-side by the FastAPI
     backend. Keys match the section id passed to dashboard(). */
  /* [3] Fragments are re-injected into the DOM with innerHTML, so every
     server-sourced string is sanitized before it lands. DOMPurify (html
     profile) keeps the table/card markup the backend emits and strips
     anything executable. Fail-closed escape fallback below. */
  function sanitizeFragment(html) {
    if (window.DOMPurify) {
      return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    }
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var FRAGMENTS = {
    summary: API_BASE + "/statistics/html/summary",
    threat: API_BASE + "/statistics/html/threat",
    topIps: API_BASE + "/statistics/html/top-ips",
    topCountries: API_BASE + "/statistics/html/top-countries",
    bots: API_BASE + "/statistics/html/bots",
    paths: API_BASE + "/statistics/html/paths",
    status: API_BASE + "/statistics/html/status",
    hourly: API_BASE + "/statistics/html/hourly",
  };

  /* ── Theme ─────────────────────────────────────────────── */
  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function prefersDark() {
    return !!(
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  /* The class lives on <html> so the whole document (including the
     page background) switches without waiting for Alpine. */
  function applyTheme(isDark) {
    document.documentElement.classList.toggle("dark", !!isDark);
  }

  var initialTheme = readStoredTheme();
  applyTheme(initialTheme ? initialTheme === "dark" : prefersDark());

  /* ── Alpine component factory ──────────────────────────── */
  window.dashboard = function dashboard(section) {
    return {
      /* null on the overview page, otherwise a FRAGMENTS key */
      section: section || null,

      isDark: readStoredTheme()
        ? readStoredTheme() === "dark"
        : prefersDark(),

      apiStatus: "loading",
      lastChecked: "",
      selectedDate: "",
      today: "",
      isLive: false,
      sseConnection: null,
      loadError: false,
      _inflight: {}, /* url -> boolean, guards against duplicate fragment fetches */

      /* ── Lifecycle ─────────────────────────────────────── */
      async init() {
        /* The backend buckets reports by its own server day (UTC). Use the
           browser's UTC date as a first approximation; checkHealth() then
           refines `today` from the server clock so the picker never offers
           a day the API cannot have data for, regardless of visitor clock. */
        var todayStr = new Date().toISOString().slice(0, 10);
        this.today = todayStr;

        var saved = null;
        try {
          saved = sessionStorage.getItem(DATE_KEY);
        } catch (e) {
          saved = null;
        }
        this.selectedDate = saved && saved <= todayStr ? saved : todayStr;

        /* only the report pages carry the health/status indicator */
        if (document.querySelector(".status-badge")) this.checkHealth();
        await this.refresh();
      },

      /* ── Data loading ──────────────────────────────────── */
      target() {
        /* section === "about" is a static page with no fragment */
        if (this.section === "about") return null;
        return this.section ? "#section-body" : "#summary-body";
      },

      fragmentUrl() {
        return this.section ? FRAGMENTS[this.section] : FRAGMENTS.summary;
      },

      async refresh() {
        var t = this.target();
        if (!t) return;
        await this.loadFragment(this.fragmentUrl(), t);
      },

      async loadFragment(url, selector) {
        var el = document.querySelector(selector);
        if (!el) return;
        /* Skip if a fetch for this exact URL is already in flight: rapid
           SSE updates (or refresh() racing its own target) would otherwise
           fire concurrent same-URL fetches whose out-of-order completion
           wins last-writer-wins and can show stale data. */
        if (this._inflight[url]) return;
        this._inflight[url] = true;
        try {
          var res = await fetch(
            url + "?date=" + encodeURIComponent(this.selectedDate),
            { headers: { "HX-Request": "true" } },
          );
          if (!res.ok) throw new Error("HTTP " + res.status);
          /* [3] defense-in-depth: fragments are server-rendered HTML whose
             cells contain visitor-controlled values (paths, UAs, IPs). The
             backend escapes at the source; here we additionally run every
             fragment through DOMPurify (html profile keeps markup/inline
             styles, strips <script>, event handlers, javascript: URLs and
             embedded objects) so a single missed escape cannot become XSS.
             If DOMPurify ever fails to load we fail closed: escape the raw
             text (page shows inert markup instead of executing it). */
          el.innerHTML = sanitizeFragment(await res.text());
          this.loadError = false;
        } catch (e) {
          console.warn("Failed to load " + selector, e);
          this.loadError = true;
        } finally {
          this._inflight[url] = false;
        }
      },

      async checkHealth() {
        try {
          var res = await fetch(API_BASE + "/health", { cache: "no-store" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          var body = null;
          try {
            body = await res.json();
          } catch (e) {
            /* non-JSON health body — nothing to anchor the date on */
          }
          this.apiStatus = "ok";
          /* Anchor the date picker's max to the server clock (UTC). */
          if (body && body.data && body.data.timestamp) {
            this.today = String(body.data.timestamp).slice(0, 10);
            if (this.selectedDate > this.today) this.selectedDate = this.today;
          }
        } catch (e) {
          this.apiStatus = "offline";
        }
        this.lastChecked = new Date().toLocaleTimeString();
      },

      /* ── Controls ──────────────────────────────────────── */
      toggleTheme() {
        this.isDark = !this.isDark;
        applyTheme(this.isDark);
        try {
          localStorage.setItem(THEME_KEY, this.isDark ? "dark" : "light");
        } catch (e) {
          /* private mode — theme simply won't persist */
        }
      },

      loadDay() {
        try {
          sessionStorage.setItem(DATE_KEY, this.selectedDate);
        } catch (e) {
          /* ignore */
        }
        if (this.isLive) this.setupSSE();
        this.refresh();
      },

      /* ── Live mode (Server-Sent Events) ────────────────── */
      toggleLive() {
        this.isLive = !this.isLive;
        if (this.isLive) {
          this.setupSSE();
        } else if (this.sseConnection) {
          this.sseConnection.close();
          this.sseConnection = null;
        }
      },

      setupSSE() {
        if (this.sseConnection) this.sseConnection.close();

        var url = API_BASE + "/statistics/sse?date=" + encodeURIComponent(this.selectedDate);
        this.sseConnection = new EventSource(url);

        this.sseConnection.onmessage = (event) => {
          var data;
          try {
            data = JSON.parse(event.data);
          } catch (e) {
            return; /* heartbeat / comment frames carry no payload */
          }
          if (data && data.type === "update") {
            this.refresh();
            this.lastChecked = new Date().toLocaleTimeString();
          }
        };

        this.sseConnection.onerror = () => {
          /* EventSource reconnects on its own; only an explicit
             close() (Stop Live) ends the stream for good. */
          console.warn("SSE connection interrupted — retrying.");
        };
      },
    };
  };
})();
