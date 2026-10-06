/**
 * Local MDX search in the top navbar (replaces Mintlify ⌘K entry visually).
 * Index: /search-index.json from scripts/build-search-index.mjs
 */
(function localSearchNav() {
  const INDEX_URL = "/search-index.json";
  const HOST_ID = "local-search-nav";
  const PROMPT = "Search tables, SQL, keys…";
  const SUGGESTIONS = [
    { label: ".schema", q: ".schema" },
    { label: "primary key", q: "primary key" },
    { label: "JOIN", q: "JOIN" },
    { label: "WHERE", q: "WHERE" },
    { label: "SELECT", q: "SELECT" },
  ];

  let pages = null;
  let loadPromise = null;
  let open = false;
  let activeIndex = -1;

  function loadIndex() {
    if (pages) return Promise.resolve(pages);
    if (loadPromise) return loadPromise;
    loadPromise = fetch(`${INDEX_URL}?v=${Date.now()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`search index ${res.status}`);
        return res.json();
      })
      .then((data) => {
        pages = (Array.isArray(data) ? data : data.pages || []).map(enrichPage);
        return pages;
      })
      .catch((err) => {
        loadPromise = null;
        console.warn("[local-search-nav]", err);
        pages = [];
        return pages;
      });
    return loadPromise;
  }

  function enrichPage(page) {
    const title = String(page.title || "");
    const description = String(page.description || "");
    const keywords = (page.keywords || []).map(String);
    const headings = (page.headings || []).map(String);
    const raw = [title, description, ...keywords, ...headings, page.text || ""].join("\n");
    return {
      ...page,
      title,
      description,
      keywords,
      headings,
      _raw: raw.toLowerCase(),
      _norm: normalizeAlnum(raw),
    };
  }

  function normalizeAlnum(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}.]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(query) {
    const q = String(query).toLowerCase().trim();
    if (!q) return [];
    // Keep dotted commands (.schema) and SQL-ish tokens intact.
    const parts = q.match(/\.[\w]+|[\w]+(?:'[\w]+)?|[^\s\w]+/g) || [];
    return parts.map((p) => p.trim()).filter((p) => p && !/^[,;:]+$/.test(p));
  }

  function variants(token) {
    const t = token.toLowerCase();
    const out = new Set([t]);
    if (t.startsWith(".")) out.add(t.slice(1));
    const alnum = t.replace(/[^\p{L}\p{N}]+/gu, "");
    if (alnum) out.add(alnum);
    return [...out];
  }

  function includesAny(hay, tokenVars) {
    for (const v of tokenVars) {
      if (!v) continue;
      if (hay.includes(v)) return true;
    }
    return false;
  }

  function scorePage(page, tokens, phrase) {
    let score = 0;
    const title = page.title.toLowerCase();
    const description = page.description.toLowerCase();
    const keywords = page.keywords.map((k) => k.toLowerCase());
    const headings = page.headings.map((h) => h.toLowerCase());
    const titleNorm = normalizeAlnum(title);
    const hay = page._raw;
    const hayNorm = page._norm;

    if (phrase) {
      if (title === phrase) score += 80;
      else if (title.includes(phrase)) score += 50;
      else if (keywords.some((k) => k === phrase)) score += 45;
      else if (keywords.some((k) => k.includes(phrase))) score += 30;
      else if (hay.includes(phrase)) score += 20;
      else if (hayNorm.includes(normalizeAlnum(phrase))) score += 16;
    }

    for (const token of tokens) {
      const vars = variants(token);
      let hit = false;
      let tokenScore = 0;

      if (includesAny(title, vars) || includesAny(titleNorm, vars)) {
        hit = true;
        tokenScore += vars.some((v) => title === v) ? 40 : title.startsWith(token) ? 28 : 18;
      }

      for (const kw of keywords) {
        if (includesAny(kw, vars) || includesAny(normalizeAlnum(kw), vars)) {
          hit = true;
          tokenScore += vars.some((v) => kw === v) ? 26 : 14;
          break;
        }
      }

      for (const h of headings) {
        if (includesAny(h, vars) || includesAny(normalizeAlnum(h), vars)) {
          hit = true;
          tokenScore += 10;
          break;
        }
      }

      if (includesAny(description, vars)) {
        hit = true;
        tokenScore += 6;
      }

      if (!hit && (includesAny(hay, vars) || includesAny(hayNorm, vars))) {
        hit = true;
        tokenScore += 4;
      }

      if (!hit) return 0;
      score += tokenScore;
    }

    // Prefer shorter, more specific pages when scores tie later.
    if (page.href.startsWith("/concepts/")) score += 2;
    if (page.href.startsWith("/reference/")) score += 1;
    return score;
  }

  function search(query) {
    const phrase = String(query).toLowerCase().trim();
    const tokens = tokenize(phrase);
    if (!tokens.length || !pages) return [];
    return pages
      .map((page) => ({ page, score: scorePage(page, tokens, phrase) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
      .slice(0, 12);
  }

  function groupLabel(href) {
    if (href.startsWith("/concepts/")) return "Concepts";
    if (href.startsWith("/reference/")) return "Reference";
    if (href.startsWith("/how-to/")) return "How-to";
    if (href.startsWith("/tutorials/")) return "Tutorial";
    return "Docs";
  }

  function setPanelOpen(root, next) {
    if (!root) return;
    open = next;
    root.classList.toggle("is-open", open);
    if (!open) {
      root.classList.remove("is-mobile-sheet");
      activeIndex = -1;
    }
    const panel = root.querySelector("[data-local-search-panel]");
    if (panel) panel.hidden = !open;
  }

  function setActive(root, index) {
    const hits = [...root.querySelectorAll(".local-search-nav__hit")];
    if (!hits.length) {
      activeIndex = -1;
      return;
    }
    activeIndex = ((index % hits.length) + hits.length) % hits.length;
    hits.forEach((el, i) => {
      el.classList.toggle("is-active", i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: "nearest" });
    });
  }

  function renderResults(root, query) {
    const list = root.querySelector("[data-local-search-results]");
    const empty = root.querySelector("[data-local-search-empty]");
    const suggest = root.querySelector("[data-local-search-suggest]");
    if (!list || !empty || !suggest) return;

    const q = query.trim();
    activeIndex = -1;

    if (!q) {
      list.innerHTML = "";
      empty.hidden = false;
      empty.textContent = pages
        ? `Search ${pages.length} pages · titles, keywords, headings`
        : "Loading index…";
      suggest.hidden = false;
      suggest.innerHTML = SUGGESTIONS.map(
        (s) =>
          `<button type="button" class="local-search-nav__chip" data-q="${escapeAttr(s.q)}">${escapeHtml(s.label)}</button>`
      ).join("");
      return;
    }

    suggest.hidden = true;
    suggest.innerHTML = "";
    const rows = search(q);
    empty.hidden = rows.length > 0;
    empty.textContent = rows.length ? "" : `No matches for “${q}”. Try schema, SELECT, or primary key.`;
    list.innerHTML = rows
      .map(({ page }) => {
        const desc = page.description
          ? `<div class="local-search-nav__desc">${escapeHtml(page.description)}</div>`
          : "";
        return `<li>
          <a class="local-search-nav__hit" href="${escapeAttr(page.href)}">
            <div class="local-search-nav__meta">${escapeHtml(groupLabel(page.href))}</div>
            <div class="local-search-nav__title">${escapeHtml(page.title)}</div>
            ${desc}
          </a>
        </li>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function findHost() {
    const entry = document.querySelector("#search-bar-entry");
    if (entry?.parentElement) return entry.parentElement;
    return document.querySelector(
      "#navbar .relative.hidden.lg\\:flex.items-center.flex-1"
    );
  }

  function findMobileHost() {
    const entry = document.querySelector("#search-bar-entry-mobile");
    return entry?.parentElement || null;
  }

  function mount() {
    mountDesktop();
    mountMobile();
  }

  function mountDesktop() {
    if (document.getElementById(HOST_ID)) return;
    const host = findHost();
    if (!host) return;

    const root = document.createElement("div");
    root.id = HOST_ID;
    root.className = "local-search-nav";
    root.innerHTML = `
      <label class="local-search-nav__field">
        <span class="local-search-nav__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
        </span>
        <input
          data-local-search-input
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="${PROMPT}"
          aria-label="Search documentation"
          aria-controls="local-search-panel"
        />
        <kbd class="local-search-nav__kbd">⌘K</kbd>
      </label>
      <div class="local-search-nav__panel" id="local-search-panel" data-local-search-panel hidden>
        <p class="local-search-nav__empty" data-local-search-empty></p>
        <div class="local-search-nav__suggest" data-local-search-suggest hidden></div>
        <ul class="local-search-nav__results" data-local-search-results></ul>
      </div>
    `;

    const entry = host.querySelector("#search-bar-entry");
    if (entry) host.insertBefore(root, entry);
    else host.prepend(root);

    const input = root.querySelector("[data-local-search-input]");

    const refresh = () => {
      loadIndex().then(() => renderResults(root, input.value));
    };

    root.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-q]");
      if (!chip) return;
      input.value = chip.getAttribute("data-q") || "";
      input.focus();
      setPanelOpen(root, true);
      refresh();
    });

    input.addEventListener("focus", () => {
      setPanelOpen(root, true);
      refresh();
    });
    input.addEventListener("input", () => {
      setPanelOpen(root, true);
      refresh();
    });
    input.addEventListener("keydown", (e) => {
      const hits = root.querySelectorAll(".local-search-nav__hit");
      if (e.key === "ArrowDown" && hits.length) {
        e.preventDefault();
        setPanelOpen(root, true);
        setActive(root, activeIndex < 0 ? 0 : activeIndex + 1);
      } else if (e.key === "ArrowUp" && hits.length) {
        e.preventDefault();
        setActive(root, activeIndex < 0 ? hits.length - 1 : activeIndex - 1);
      } else if (e.key === "Escape") {
        setPanelOpen(root, false);
        input.blur();
      } else if (e.key === "Enter") {
        const target =
          (activeIndex >= 0 && hits[activeIndex]) || hits[0];
        if (target) {
          e.preventDefault();
          window.location.href = target.getAttribute("href");
        }
      }
    });

    document.addEventListener(
      "mousedown",
      (e) => {
        if (!root.contains(e.target)) setPanelOpen(root, false);
      },
      true
    );

    loadIndex().then(() => renderResults(root, ""));
  }

  function mountMobile() {
    const mobileId = `${HOST_ID}-mobile`;
    if (document.getElementById(mobileId)) return;
    const host = findMobileHost();
    if (!host) return;

    const btn = document.createElement("button");
    btn.id = mobileId;
    btn.type = "button";
    btn.className = "local-search-nav-mobile";
    btn.setAttribute("aria-label", "Search documentation");
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
      </svg>
    `;
    btn.addEventListener("click", () => {
      mountDesktop();
      const root = document.getElementById(HOST_ID);
      const input = root?.querySelector("[data-local-search-input]");
      if (!root || !input) return;
      root.classList.add("is-mobile-sheet");
      setPanelOpen(root, true);
      input.focus();
      loadIndex().then(() => renderResults(root, input.value));
    });

    const entry = host.querySelector("#search-bar-entry-mobile");
    if (entry) host.insertBefore(btn, entry);
    else host.prepend(btn);
  }

  function focusSearch(e) {
    const isModK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
    if (!isModK) return;
    e.preventDefault();
    e.stopPropagation();
    mount();
    const root = document.getElementById(HOST_ID);
    const input = root?.querySelector("[data-local-search-input]");
    if (!input || !root) return;
    input.focus();
    setPanelOpen(root, true);
    loadIndex().then(() => renderResults(root, input.value));
  }

  document.addEventListener("keydown", focusSearch, true);

  function boot() {
    mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  new MutationObserver(() => {
    if (!document.getElementById(HOST_ID)) mount();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
