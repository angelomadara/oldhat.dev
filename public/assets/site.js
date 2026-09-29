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
  var API = "/api/v1";

  /* HTML fragment endpoints, rendered server-side by the FastAPI
     backend. Keys match the section id passed to dashboard(). */
  var FRAGMENTS = {
    summary: API + "/statistics/html/summary",
    threat: API + "/statistics/html/threat",
    topIps: API + "/statistics/html/top-ips",
    bots: API + "/statistics/html/bots",
    paths: API + "/statistics/html/paths",
    status: API + "/statistics/html/status",
    hourly: API + "/statistics/html/hourly",
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

      /* ── Lifecycle ─────────────────────────────────────── */
      async init() {
        var todayStr = new Date().toISOString().slice(0, 10);
        this.today = todayStr;

        var saved = null;
        try {
          saved = sessionStorage.getItem(DATE_KEY);
        } catch (e) {
          saved = null;
        }
        this.selectedDate = saved && saved <= todayStr ? saved : todayStr;

        this.checkHealth();
        await this.refresh();
      },

      /* ── Data loading ──────────────────────────────────── */
      target() {
        return this.section ? "#section-body" : "#summary-body";
      },

      fragmentUrl() {
        return this.section ? FRAGMENTS[this.section] : FRAGMENTS.summary;
      },

      async refresh() {
        await this.loadFragment(this.fragmentUrl(), this.target());
      },

      async loadFragment(url, selector) {
        var el = document.querySelector(selector);
        if (!el) return;
        try {
          var res = await fetch(
            url + "?date=" + encodeURIComponent(this.selectedDate),
            { headers: { "HX-Request": "true" } },
          );
          if (!res.ok) throw new Error("HTTP " + res.status);
          el.innerHTML = await res.text();
          this.loadError = false;
        } catch (e) {
          console.warn("Failed to load " + selector, e);
          this.loadError = true;
        }
      },

      async checkHealth() {
        try {
          var res = await fetch(API + "/health", { cache: "no-store" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          this.apiStatus = "ok";
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

        var url = API + "/statistics/sse?date=" + encodeURIComponent(this.selectedDate);
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
