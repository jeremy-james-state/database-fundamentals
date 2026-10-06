/**
 * Local MDX search in the top navbar (replaces Mintlify ⌘K entry visually).
 * Index: /search-index.json from scripts/build-search-index.mjs
 */
(function localSearchNav() {
  const INDEX_URL = "/search-index.json";
  const HOST_ID = "local-search-nav";
  const PROMPT = "Search tables, SQL, keys…";

  let pages = null;
  let loadPromise = null;
  let open = false;

  function loadIndex() {
    if (pages) return Promise.resolve(pages);
    if (loadPromise) return loadPromise;
    loadPromise = fetch(INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`search index ${res.status}`);
        return res.json();
      })
      .then((data) => {
        pages = Array.isArray(data) ? data : data.pages || [];
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

  function scorePage(page, tokens) {
    let score = 0;
    const title = page.title.toLowerCase();
    const description = (page.description || "").toLowerCase();
    const keywords = (page.keywords || []).map((k) => String(k).toLowerCase());
    const headings = (page.headings || []).map((h) => String(h).toLowerCase());
    const hay = page.text || [title, description, ...keywords, ...headings].join(" ");

    for (const token of tokens) {
      if (!token) continue;
      if (title === token) score += 40;
      else if (title.startsWith(token)) score += 28;
      else if (title.includes(token)) score += 18;

      for (const kw of keywords) {
        if (kw === token) score += 22;
        else if (kw.includes(token)) score += 12;
      }

      for (const h of headings) {
        if (h.includes(token)) score += 8;
      }

      if (description.includes(token)) score += 6;
      if (!hay.includes(token)) return 0;
    }

    return score;
  }

  function search(query) {
    const tokens = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length || !pages) return [];
    return pages
      .map((page) => ({ page, score: scorePage(page, tokens) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
      .slice(0, 12);
  }

  function setPanelOpen(root, next) {
    if (!root) return;
    open = next;
    root.classList.toggle("is-open", open);
    if (!open) root.classList.remove("is-mobile-sheet");
    const panel = root.querySelector("[data-local-search-panel]");
    if (panel) panel.hidden = !open;
  }

  function renderResults(root, query) {
    const list = root.querySelector("[data-local-search-results]");
    const empty = root.querySelector("[data-local-search-empty]");
    if (!list || !empty) return;

    const q = query.trim();
    if (!q) {
      list.innerHTML = "";
      empty.hidden = false;
      empty.textContent = `Local index · ${pages ? pages.length : "…"} pages`;
      return;
    }

    const rows = search(q);
    empty.hidden = rows.length > 0;
    empty.textContent = rows.length ? "" : `No matches for “${q}”.`;
    list.innerHTML = rows
      .map(({ page }) => {
        const desc = page.description
          ? `<div class="local-search-nav__desc">${escapeHtml(page.description)}</div>`
          : "";
        return `<li>
          <a class="local-search-nav__hit" href="${escapeAttr(page.href)}">
            <div class="local-search-nav__title">${escapeHtml(page.title)}</div>
            ${desc}
            <div class="local-search-nav__href">${escapeHtml(page.href)}</div>
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
        />
        <kbd class="local-search-nav__kbd">⌘K</kbd>
      </label>
      <div class="local-search-nav__panel" data-local-search-panel hidden>
        <p class="local-search-nav__empty" data-local-search-empty></p>
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

    input.addEventListener("focus", () => {
      setPanelOpen(root, true);
      refresh();
    });
    input.addEventListener("input", () => {
      setPanelOpen(root, true);
      refresh();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setPanelOpen(root, false);
        input.blur();
      }
      if (e.key === "Enter") {
        const first = root.querySelector(".local-search-nav__hit");
        if (first) {
          e.preventDefault();
          window.location.href = first.getAttribute("href");
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
    const input = document.querySelector("#local-search-nav [data-local-search-input]");
    if (!input) return;
    e.preventDefault();
    e.stopPropagation();
    mount();
    input.focus();
    setPanelOpen(document.getElementById(HOST_ID), true);
    loadIndex().then(() => renderResults(document.getElementById(HOST_ID), input.value));
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
