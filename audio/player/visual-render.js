import { sceneAtLyric, activeActions } from "./visual-stage.js?v=56";

const VENDORS = ["MySQL", "MariaDB", "PostgreSQL", "SQL Server", "SQLite"];

/** Monochrome brand marks (simple path icons) for schema app row — theme-matched, not full-color. */
const APP_ICONS = {
  Facebook:
    '<path d="M14 8h2.5V5.5A18 18 0 0 0 13.8 5C10.9 5 9 6.8 9 9.8V12H6.5v3H9v8h3.5v-8H15l.5-3H12.5V9.7c0-.9.2-1.7 1.5-1.7z"/>',
  Instagram:
    '<path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2z"/><path d="M17.5 6.2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"/><path d="M12 3.5c-2.4 0-2.7 0-3.6.05-2.2.1-3.8 1.7-3.9 3.9-.05.9-.05 1.2-.05 3.55s0 2.65.05 3.55c.1 2.2 1.7 3.8 3.9 3.9.9.05 1.2.05 3.6.05s2.7 0 3.6-.05c2.2-.1 3.8-1.7 3.9-3.9.05-.9.05-1.2.05-3.55s0-2.65-.05-3.55c-.1-2.2-1.7-3.8-3.9-3.9-.9-.05-1.2-.05-3.6-.05zm0 1.5c2.3 0 2.6 0 3.5.05 1.6.07 2.5 1 2.55 2.55.05.9.05 1.15.05 3.4s0 2.5-.05 3.4c-.07 1.55-1 2.48-2.55 2.55-.9.05-1.2.05-3.5.05s-2.6 0-3.5-.05c-1.55-.07-2.48-1-2.55-2.55C5.95 14.5 5.95 14.25 5.95 12s0-2.5.05-3.4c.07-1.55 1-2.48 2.55-2.55.9-.05 1.2-.05 3.5-.05z"/>',
  Spotify:
    '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.45a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 0 1-.33-1.46c4.55-1.03 8.48-.59 11.66 1.34a.75.75 0 0 1 .25 1.03zm1.23-2.74a.9.9 0 0 1-1.24.3c-3.23-1.98-8.15-2.56-11.97-1.4a.9.9 0 1 1-.53-1.72c4.3-1.32 9.7-.68 13.44 1.62a.9.9 0 0 1 .3 1.2zm.1-2.86c-3.86-2.29-10.24-2.5-13.92-1.38a1.05 1.05 0 1 1-.6-2.01c4.22-1.27 11.2-1.02 15.62 1.6a1.05 1.05 0 0 1-1.1 1.79z"/>',
  Uber:
    '<path d="M12 2a10 10 0 1 0 0.01 20.01A10 10 0 0 0 12 2zm0 2.2a7.8 7.8 0 0 1 0 15.6V12H8.2a.9.9 0 0 1 0-1.8H12V4.2z"/>',
  YouTube:
    '<path d="M22.5 7.2a2.9 2.9 0 0 0-2-2.05C18.7 4.7 12 4.7 12 4.7s-6.7 0-8.5.45a2.9 2.9 0 0 0-2 2.05A30 30 0 0 0 1 12a30 30 0 0 0 .5 4.8 2.9 2.9 0 0 0 2 2.05c1.8.45 8.5.45 8.5.45s6.7 0 8.5-.45a2.9 2.9 0 0 0 2-2.05A30 30 0 0 0 23 12a30 30 0 0 0-.5-4.8zM9.9 15.2V8.8L15.6 12l-5.7 3.2z"/>',
  LinkedIn:
    '<path d="M6.2 9.2H3.4V20h2.8V9.2zM4.8 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM20.6 20h-2.8v-5.3c0-1.26-.02-2.88-1.76-2.88-1.76 0-2.03 1.37-2.03 2.79V20H11V9.2h2.7v1.47h.04c.38-.72 1.3-1.48 2.68-1.48 2.86 0 3.39 1.88 3.39 4.33V20z"/>',
};

function appIconSvg(name) {
  const path = APP_ICONS[name];
  if (!path) return "";
  return `<svg class="viz-app-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${path}</svg>`;
}

export function createVisualController(root, slideImg) {
  let lastSceneId = "";
  let lastSignature = "";

  function showImageMode(on) {
    root.classList.toggle("is-image-mode", on);
    slideImg.classList.toggle("is-visible", on);
  }

  function renderScene(scene) {
    root.dataset.scene = scene.id;
    root.dataset.kind = scene.kind;
    root.innerHTML = "";
    showImageMode(false);

    const card = document.createElement("div");
    card.className = "viz-card";
    card.dataset.kind = scene.kind;

    if (scene.kind === "table" || scene.kind === "chaos") {
      card.innerHTML = renderTable(scene);
    } else if (scene.kind === "schema") {
      card.innerHTML = renderSchema(scene);
    } else if (scene.kind === "map") {
      card.innerHTML = renderMap(scene);
    } else if (scene.kind === "roadmap") {
      card.innerHTML = renderRoadmap(scene);
    } else if (scene.kind === "one-table") {
      card.innerHTML = renderOneTable();
    } else if (scene.kind === "entity-chips") {
      card.innerHTML = renderEntityChips();
    } else if (scene.kind === "product-teach") {
      card.innerHTML = renderProductTeach();
    } else if (scene.kind === "cards") {
      card.innerHTML = renderCards(scene);
    } else if (scene.kind === "bad-grid") {
      card.innerHTML = renderBadGrid(scene);
    } else if (scene.kind === "rdbms") {
      card.innerHTML = renderRdbms();
    } else if (scene.kind === "sql") {
      card.innerHTML = renderSql(scene);
    } else if (scene.kind === "title") {
      card.innerHTML = `
        <p class="viz-title-main is-hold">${esc(scene.title)}</p>
        <p class="viz-title-sub" data-slot="subtitle"></p>
        <div class="viz-chips" data-slot="chips"></div>
      `;
    }

    root.appendChild(card);
  }

  function renderTable(scene) {
    const head = scene.headers
      .map((h, i) => `<th data-col="${i}">${esc(h)}</th>`)
      .join("");
    const body = scene.rows
      .map((row, r) => {
        const meta = (scene.rowMeta && scene.rowMeta[r]) || {};
        const cls = [meta.dup ? "is-dup" : "", meta.missing ? "has-missing" : ""]
          .filter(Boolean)
          .join(" ");
        const cells = row
          .map((cell, c) => {
            const missing = cell === "(missing)" ? " is-missing" : "";
            return `<td data-col="${c}" class="${missing}">${esc(cell)}</td>`;
          })
          .join("");
        return `<tr data-row="${r}" class="${cls}">${cells}</tr>`;
      })
      .join("");
    return `
      <div class="viz-table-wrap is-hold" data-slot="table">
        <table class="viz-table">
          <thead class="is-hold" data-slot="thead"><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="viz-hint is-hold" data-slot="hint">You need structure.</p>
    `;
  }

  function renderSchema(scene) {
    const tables = (scene.tables || [])
      .map((t) => {
        const fks = t.fks || {};
        const cols = t.cols
          .map((c) => {
            const isPk = t.pk && c === t.pk;
            const fkTo = fks[c];
            const cls = [isPk ? "is-pk" : "", fkTo ? "is-fk" : ""].filter(Boolean).join(" ");
            const badge = isPk
              ? `<em>PK</em> `
              : fkTo
                ? `<em class="viz-fk-badge">FK</em> `
                : "";
            const fkHint = fkTo
              ? `<span class="viz-fk-to is-hold" data-fk="${esc(t.id)}.${esc(c)}">→ ${esc(fkTo)}</span>`
              : "";
            return `<li class="${cls}" data-col="${esc(c)}" data-end="${esc(t.id)}.${esc(c)}">${badge}${esc(c)}${fkHint}</li>`;
          })
          .join("");
        const hub = t.hub ? ` data-hub="true"` : "";
        return `
      <div class="viz-schema-table is-hold" data-table="${esc(t.id)}" data-hue="${esc(t.id)}"${hub}>
        <header>${esc(t.label)}${t.hub ? `<span class="viz-hub-tag is-hold" data-slot="hub-tag">hub</span>` : ""}${t.id === "products" ? `<span class="viz-next-tag is-hold" data-slot="next-table">this table next</span>` : ""}</header>
        <ul>${cols}</ul>
      </div>`;
      })
      .join("");
    const links = (scene.links || [])
      .map(
        (link, i) =>
          `<li class="viz-schema-link is-hold" data-link="${i}" data-hue="${esc(link.hue || "")}" data-pairs="${esc((link.pairs || []).join(","))}" data-tables="${esc((link.tables || []).join(","))}"><strong>${esc(link.from)}</strong> <span>${esc(link.via)}</span> <strong>${esc(link.to)}</strong></li>`
      )
      .join("");
    const apps = (scene.apps || [])
      .map((a, i) => {
        const label = esc(a);
        return `<span class="viz-app is-hold" data-app="${i}" data-name="${label}" role="img" aria-label="${label}" title="${label}">${appIconSvg(a)}<span class="viz-app-name">${label}</span></span>`;
      })
      .join("");
    return `
      <p class="viz-title-main is-hold" data-slot="title">${esc(scene.title)}</p>
      <div class="viz-schema is-hold" data-slot="schema">
        <div class="viz-schema-grid">
          ${tables}
          <div class="viz-rel-gutter is-hold" data-slot="gutter"></div>
        </div>
        ${links ? `<ul class="viz-schema-links" data-slot="links">${links}</ul>` : ""}
      </div>
      <div class="viz-apps" data-slot="apps">${apps}</div>
    `;
  }

  function renderMap(scene) {
    /* Recap as a vertical flow — not vague definition cards */
    const nodes = (scene.nodes || [])
      .map((n, i) => {
        const arrow =
          i < (scene.nodes || []).length - 1
            ? `<div class="viz-flow-arrow is-hold" data-arrow="${i}" aria-hidden="true"></div>`
            : "";
        return `
      <div class="viz-flow-node is-hold" data-node="${esc(n.id)}">
        <strong>${esc(n.label).replace(/\n/g, "<br>")}</strong>
        <span>${esc(n.sub || "")}</span>
      </div>
      ${arrow}`;
      })
      .join("");
    return `
      <p class="viz-eyebrow is-hold" data-slot="title">${esc(scene.title)}</p>
      <div class="viz-flow" data-slot="flow">${nodes}</div>
      ${scene.next ? `<p class="viz-next is-hold" data-slot="next">${esc(scene.next)}</p>` : ""}
    `;
  }

  function renderRoadmap(scene) {
    const answers = scene.answers || [];
    const questions = (scene.questions || [])
      .map((q, i) => {
        const ans = answers[i]
          ? `<span class="viz-q-ans is-hold" data-a="${i}">${esc(answers[i])}</span>`
          : "";
        return `<li class="viz-q-line is-hold" data-q="${i}"><span class="viz-q-ask">${esc(q)}</span>${ans}</li>`;
      })
      .join("");
    return `
      <ul class="viz-q-stack" data-slot="questions">${questions}</ul>
    `;
  }

  function renderOneTable() {
    /* Real table chrome — reads as rows/columns, not floating boxes */
    return `
      <div class="viz-one-table">
        <div class="viz-mini-table-wrap is-hold" data-slot="grid">
          <table class="viz-mini-table">
            <thead>
              <tr>
                <th>product_id</th>
                <th>name</th>
                <th>price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Selfie Toaster</td>
                <td>24.99</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Cat-Poop Coffee</td>
                <td>29.99</td>
              </tr>
              <tr>
                <td>3</td>
                <td>The Neuralyzer</td>
                <td>33.55</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="viz-diagram-label is-hold" data-slot="entity-label">one table · one job</p>
      </div>
    `;
  }

  function renderEntityChips() {
    return `
      <div class="viz-entity-chips">
        <p class="viz-entity-ask is-hold" data-slot="question">So what’s an entity?</p>
        <p class="viz-sub is-hold" data-slot="define">A thing you can describe.</p>
        <div class="viz-chip-row">
          <span class="viz-teach-chip is-hold" data-chip="product">product</span>
          <span class="viz-teach-chip is-hold" data-chip="customer">customer</span>
          <span class="viz-teach-chip is-hold" data-chip="order">order</span>
        </div>
        <p class="viz-diagram-label is-hold" data-slot="hint-attrs">…with attributes</p>
      </div>
    `;
  }

  function renderProductTeach() {
    /* One 5-col sync grid: PK spacer + attrs share tracks with the table via subgrid */
    return `
      <div class="viz-teach">
        <div class="viz-teach-entity-row">
          <span class="viz-teach-label is-hold" data-slot="entity-label">Entity:</span>
          <div class="viz-teach-box is-hold" data-slot="entity">Product</div>
        </div>
        <div class="viz-teach-sync">
          <span class="viz-teach-label viz-teach-attrs-label is-hold" data-slot="attrs-label">Attributes:</span>
          <div class="viz-teach-cols">
            <div class="viz-teach-col viz-teach-col-pk" aria-hidden="true"></div>
            <div class="viz-teach-col">
              <div class="viz-teach-box is-hold" data-attr="name">Name</div>
              <span class="viz-teach-chevron" aria-hidden="true"></span>
            </div>
            <div class="viz-teach-col">
              <div class="viz-teach-box is-hold" data-attr="description">Description</div>
              <span class="viz-teach-chevron" aria-hidden="true"></span>
            </div>
            <div class="viz-teach-col">
              <div class="viz-teach-box is-hold" data-attr="price">Price</div>
              <span class="viz-teach-chevron" aria-hidden="true"></span>
            </div>
            <div class="viz-teach-col">
              <div class="viz-teach-box is-hold" data-attr="manufacturer">Manufacturer</div>
              <span class="viz-teach-chevron" aria-hidden="true"></span>
            </div>
          </div>
          <div class="viz-teach-table-wrap is-hold" data-slot="table">
            <table class="viz-teach-table">
              <colgroup>
                <col data-col="pk" /><col data-col="name" /><col data-col="description" />
                <col data-col="price" /><col data-col="manufacturer" />
              </colgroup>
              <thead>
                <tr>
                  <th data-col="pk" class="is-hold">product_id</th>
                  <th data-col="name">name</th>
                  <th data-col="description">description</th>
                  <th data-col="price">price</th>
                  <th data-col="manufacturer">manufacturer</th>
                </tr>
              </thead>
              <tbody class="is-hold" data-slot="rows">
                <tr data-row="0">
                  <td data-col="pk">1</td>
                  <td data-col="name">Atomic Nose Hair Trimmer</td>
                  <td data-col="description">…</td>
                  <td data-col="price">19.99</td>
                  <td data-col="manufacturer">Mad Inventors Inc.</td>
                </tr>
                <tr data-row="1">
                  <td data-col="pk">2</td>
                  <td data-col="name">Selfie Toaster</td>
                  <td data-col="description">…</td>
                  <td data-col="price">24.99</td>
                  <td data-col="manufacturer">Goofy Gadgets Corp.</td>
                </tr>
                <tr data-row="more" aria-hidden="true">
                  <td>⋮</td><td>⋮</td><td>⋮</td><td>⋮</td><td>⋮</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="viz-teach-legend">
          <span class="viz-callout viz-callout-pk is-hold" data-slot="callout-pk">The primary key</span>
          <span class="viz-callout viz-callout-column is-hold" data-slot="callout-column">A column</span>
          <span class="viz-callout viz-callout-row is-hold" data-slot="callout-row">A row</span>
        </div>
      </div>
    `;
  }

  function renderBadGrid(scene) {
    const head = (scene.headers || [])
      .map((h, i) => {
        const cust = h.startsWith("customer") ? " is-customer-col" : "";
        return `<th data-col="${i}" class="${cust}">${esc(h)}</th>`;
      })
      .join("");
    const body = (scene.rows || [])
      .map((row, r) => {
        const meta = (scene.rowMeta && scene.rowMeta[r]) || {};
        const cells = row
          .map((cell, c) => {
            const cust = c >= 3 && c <= 5 ? " is-customer-col" : "";
            return `<td data-col="${c}" class="${cust}">${esc(cell)}</td>`;
          })
          .join("");
        return `<tr data-row="${r}" data-customer="${esc(meta.customer || "")}" class="${meta.dup ? "is-dup" : ""}">${cells}</tr>`;
      })
      .join("");
    return `
      <p class="viz-eyebrow is-hold" data-slot="eyebrow">${esc(scene.eyebrow || "")}</p>
      <h2 class="viz-heading is-hold" data-slot="title">${esc(scene.title || "")}</h2>
      ${scene.subtitle ? `<p class="viz-sub is-hold" data-slot="subtitle">${esc(scene.subtitle)}</p>` : ""}
      <div class="viz-bad-wrap is-hold" data-slot="grid">
        <table class="viz-bad-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}
            <tr class="viz-insert-row is-hold" data-slot="insert-row">
              <td>—</td>
              <td>new product</td>
              <td>—</td>
              <td class="is-customer-col is-required">?</td>
              <td class="is-customer-col is-required">required</td>
              <td class="is-customer-col is-required">required</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="viz-flag" data-slot="flag"></p>
      <p class="viz-hint is-hold" data-slot="hint">One table.<br />One entity.</p>
    `;
  }

  function renderCards(scene) {
    return `
      <p class="viz-eyebrow is-hold" data-slot="eyebrow">${esc(scene.eyebrow || "")}</p>
      <h2 class="viz-heading is-hold" data-slot="title">${esc(scene.title || "")}</h2>
      <p class="viz-sub is-hold" data-slot="subtitle">${esc(scene.subtitle || "")}</p>
      <div class="viz-cards">
        ${(scene.cards || [])
          .map(
            (c, i) => `
          <article class="viz-product-card is-hold" data-i="${i}" data-customer="${esc(c.customer || "")}">
            <strong>${esc(c.id)} · ${esc(c.name)}</strong>
            <span>${esc(c.detail)}</span>
          </article>`
          )
          .join("")}
      </div>
      <p class="viz-flag" data-slot="flag"></p>
      <p class="viz-diagram-label is-hold" data-slot="fix">one table · one entity</p>
    `;
  }

  function renderRdbms() {
    return `
      <div class="viz-rdbms">
        <div class="viz-cylinder is-hold" data-slot="cylinder" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div class="viz-vendors">
          ${VENDORS.map((v, i) => `<span class="viz-vendor is-hold" data-vendor="${i}">${esc(v)}</span>`).join("")}
        </div>
        <div class="viz-sql-layer is-hold" data-slot="sql-layer">
          <code>SQL</code>
          <span>create · modify · query</span>
        </div>
      </div>
    `;
  }

  function renderSql(scene) {
    return `
      <p class="viz-eyebrow">${esc(scene.title || "")}</p>
      <p class="viz-prompt is-hold" data-slot="prompt">${esc(scene.prompt || "")}</p>
      <div class="viz-products is-hold" data-slot="products">
        ${(scene.products || [])
          .map(
            (p) => `
          <div class="viz-product-row" data-price="${p[2]}">
            <span>${esc(p[0])} ${esc(p[1])}</span>
            <span>$${esc(p[2])}</span>
          </div>`
          )
          .join("")}
      </div>
      <pre class="viz-sql" data-slot="sql"><code>${(scene.sql || [])
        .map((line, i) => `<span class="viz-sql-line is-hold" data-sql="${i}">${esc(line)}</span>`)
        .join("\n")}</code></pre>
      <div class="viz-results" data-slot="results"></div>
      <div class="viz-clauses" data-slot="clauses">
        ${(scene.clauses || [])
          .map(
            (c, i) => `
          <div class="viz-clause is-hold" data-i="${i}">
            <strong>${esc(c.name)}</strong>
            <span>${esc(c.text)}</span>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  function reveal(el) {
    if (!el) return;
    el.classList.remove("is-hold");
    el.classList.add("is-shown");
  }

  function applyActions(scene, actions) {
    const card = root.querySelector(".viz-card");
    if (!card) return;

    if (actions.has("enter")) card.classList.add("is-in");

    // Generic holds
    if (actions.has("show-header")) {
      reveal(card.querySelector('[data-slot="table"]'));
      reveal(card.querySelector("thead"));
    }
    if (actions.has("show-title")) {
      reveal(card.querySelector('[data-slot="title"]'));
      reveal(card.querySelector('[data-slot="eyebrow"]'));
      reveal(card.querySelector(".viz-title-main"));
      reveal(card.querySelector(".viz-heading"));
      reveal(card.querySelector('[data-slot="subtitle"]'));
    }

    // Table
    if (actions.has("reveal-rows")) card.classList.add("is-rows-in");
    const pulseCols = [...actions].filter((a) => a.startsWith("pulse-col:"));
    const pulseCol = pulseCols.length ? pulseCols[pulseCols.length - 1].split(":")[1] : null;
    card.querySelectorAll("[data-col]").forEach((el) => {
      el.classList.toggle("is-pulse", pulseCol != null && el.dataset.col === pulseCol);
    });
    if (actions.has("unease")) card.classList.add("is-unease");
    card.classList.toggle("is-show-dups", actions.has("highlight-dups"));
    card.classList.toggle("is-show-missing", actions.has("missing"));
    if (actions.has("chaos")) card.classList.add("is-chaos");
    if (actions.has("pulse")) card.classList.add("is-pulse-card");
    if (actions.has("structure-hint") || actions.has("punchline")) {
      reveal(card.querySelector('[data-slot="hint"]'));
      card.classList.add("is-hint");
    }

    // Schema — tables + FK / link storytelling (no SVG path trees)
    if (actions.has("show-schema")) reveal(card.querySelector('[data-slot="schema"]'));
    for (const a of actions) {
      if (a.startsWith("show-table:")) {
        reveal(card.querySelector(`[data-table="${a.split(":")[1]}"]`));
      }
    }
    const linkActs = [...actions].filter((a) => a.startsWith("show-link:"));
    card.querySelectorAll("[data-end]").forEach((el) => el.classList.remove("is-rel-pair"));
    card.querySelectorAll("[data-link]").forEach((el) => el.classList.remove("is-link-pulse"));
    card.querySelectorAll("[data-table]").forEach((el) => {
      el.classList.remove("is-pair", "is-dim", "is-focus-next");
    });
    card.classList.remove("is-relating", "is-focus-products");
    const gutter = card.querySelector('[data-slot="gutter"]');
    for (const a of linkActs) {
      reveal(card.querySelector(`[data-link="${a.split(":")[1]}"]`));
    }
    if (linkActs.length && !actions.has("focus-products")) {
      const idx = linkActs[linkActs.length - 1].split(":")[1];
      const linkEl = card.querySelector(`[data-link="${idx}"]`);
      linkEl?.classList.add("is-link-pulse");
      card.classList.add("is-relating");
      card.dataset.relHue = linkEl?.dataset.hue || "";
      const pairs = (linkEl?.dataset.pairs || "").split(",").filter(Boolean);
      const pairTables = (linkEl?.dataset.tables || "").split(",").filter(Boolean);
      for (const p of pairs) {
        card.querySelector(`[data-end="${p}"]`)?.classList.add("is-rel-pair");
      }
      card.querySelectorAll("[data-table]").forEach((el) => {
        const on = pairTables.includes(el.dataset.table);
        el.classList.toggle("is-pair", on);
        el.classList.toggle("is-dim", !on);
      });
      if (gutter && linkEl) {
        const via = linkEl.querySelector("span")?.textContent || "";
        gutter.textContent = via;
        gutter.dataset.hue = linkEl.dataset.hue || "";
        reveal(gutter);
      }
    }
    if (actions.has("focus-products")) {
      card.classList.add("is-focus-products");
      card.querySelectorAll("[data-table]").forEach((el) => {
        const on = el.dataset.table === "products";
        el.classList.toggle("is-focus-next", on);
        el.classList.toggle("is-dim", !on);
        el.classList.remove("is-pair");
      });
      reveal(card.querySelector('[data-slot="next-table"]'));
      if (gutter) gutter.classList.add("is-hold");
    }
    if (actions.has("show-hub")) {
      reveal(card.querySelector('[data-slot="hub-tag"]'));
      card.querySelector('[data-table="users"]')?.classList.add("is-hub");
    }
    if (actions.has("show-fk")) {
      card.querySelectorAll(".viz-fk-to").forEach((el) => reveal(el));
      card.querySelectorAll("li.is-fk").forEach((el) => el.classList.add("is-fk-lit"));
    }
    if (actions.has("show-apps")) {
      card.querySelectorAll("[data-app]").forEach((el, i) => {
        el.style.transitionDelay = `${i * 70}ms`;
        reveal(el);
      });
    }

    // Recap flow
    for (const a of actions) {
      if (a.startsWith("node:")) {
        reveal(card.querySelector(`[data-node="${a.split(":")[1]}"]`));
      }
      if (a.startsWith("arrow:")) {
        reveal(card.querySelector(`[data-arrow="${a.split(":")[1]}"]`));
      }
    }
    if (actions.has("next")) reveal(card.querySelector('[data-slot="next"]'));

    // Lesson outline (questions + nested sections)
    if (actions.has("show-questions")) {
      card.querySelectorAll("[data-q]").forEach((el, i) => {
        el.style.transitionDelay = `${i * 60}ms`;
        reveal(el);
      });
    }
    for (const a of actions) {
      if (a.startsWith("q:")) {
        reveal(card.querySelector(`[data-q="${a.split(":")[1]}"]`));
      }
      if (a.startsWith("a:")) {
        const n = a.split(":")[1];
        reveal(card.querySelector(`[data-q="${n}"]`));
        reveal(card.querySelector(`[data-a="${n}"]`));
        card.querySelector(`[data-q="${n}"]`)?.classList.add("is-answered");
      }
      if (a.startsWith("section:")) {
        reveal(card.querySelector(`[data-section="${a.split(":")[1]}"]`));
      }
      if (a.startsWith("item:")) {
        reveal(card.querySelector(`[data-item="${a.split(":")[1]}"]`));
      }
    }
    const qIdx = [...actions]
      .filter((a) => a.startsWith("q:") || a.startsWith("a:"))
      .map((a) => Number(a.split(":")[1]));
    const qCurrent = qIdx.length ? Math.max(...qIdx) : -1;
    card.querySelectorAll("[data-q]").forEach((el) => {
      el.classList.toggle("is-current", Number(el.dataset.q) === qCurrent);
    });

    // One-table
    if (actions.has("show-grid")) reveal(card.querySelector('[data-slot="grid"]'));
    if (actions.has("ask-entity")) reveal(card.querySelector('[data-slot="ask"]'));

    // Entity chips intro
    if (actions.has("show-question")) {
      reveal(card.querySelector('[data-slot="question"]'));
    }
    for (const a of actions) {
      if (a.startsWith("chip:")) {
        reveal(card.querySelector(`[data-chip="${a.split(":")[1]}"]`));
      }
    }
    if (actions.has("hint-attrs")) {
      reveal(card.querySelector('[data-slot="define"]'));
      reveal(card.querySelector('[data-slot="hint-attrs"]'));
    }

    // Product teaching diagram (Entity → Attributes → table)
    if (actions.has("show-entity-label")) reveal(card.querySelector('[data-slot="entity-label"]'));
    if (actions.has("show-entity")) reveal(card.querySelector('[data-slot="entity"]'));
    if (actions.has("show-attrs-label")) {
      reveal(card.querySelector('[data-slot="attrs-label"]'));
      card.classList.add("is-attrs-in");
    }
    for (const a of actions) {
      if (a.startsWith("attr:")) {
        reveal(card.querySelector(`[data-attr="${a.split(":")[1]}"]`));
      }
    }
    if (actions.has("show-table")) {
      reveal(card.querySelector('[data-slot="table"]'));
      card.classList.add("is-teach-table");
    }
    if (actions.has("show-rows")) {
      reveal(card.querySelector('[data-slot="rows"]'));
      card.classList.add("is-teach-rows");
    }
    if (actions.has("show-pk-col")) {
      reveal(card.querySelector('th[data-col="pk"]'));
      card.classList.add("is-pk-col");
    }
    if (actions.has("callout-column")) {
      reveal(card.querySelector('[data-slot="callout-column"]'));
      card.classList.add("is-callout-column");
    }
    if (actions.has("callout-row")) {
      reveal(card.querySelector('[data-slot="callout-row"]'));
      card.classList.add("is-callout-row");
    }
    if (actions.has("callout-pk")) {
      reveal(card.querySelector('[data-slot="callout-pk"]'));
      card.classList.add("is-callout-pk");
    }
    if (actions.has("key-glow")) card.classList.add("is-key-glow");

    // Cards
    if (actions.has("reveal-cards")) {
      card.querySelectorAll(".viz-product-card").forEach((el, i) => {
        el.style.transitionDelay = `${i * 80}ms`;
        reveal(el);
      });
    }
    // Bad denormalized grid (slide-13)
    if (actions.has("reveal-grid")) {
      reveal(card.querySelector('[data-slot="grid"]'));
      card.classList.add("is-bad-in");
    }
    card.classList.toggle("is-redundancy", actions.has("redundancy"));
    card.classList.toggle("is-anomaly", actions.has("anomaly"));
    card.classList.toggle("is-insertion", actions.has("insertion"));
    if (actions.has("redundancy") || actions.has("anomaly") || actions.has("insertion")) {
      const flag = card.querySelector('[data-slot="flag"]');
      if (flag) {
        if (actions.has("insertion")) flag.textContent = "Can't add a product without a customer.";
        else if (actions.has("anomaly")) flag.textContent = "Dave only lives on this row — delete the toaster, lose Dave.";
        else flag.textContent = "Same customer, repeated.";
        flag.classList.add("is-in");
      }
      card.classList.add("is-flag");
    }
    if (actions.has("insertion")) reveal(card.querySelector('[data-slot="insert-row"]'));
    if (actions.has("show-fix") || actions.has("punchline")) {
      reveal(card.querySelector('[data-slot="fix"]'));
      reveal(card.querySelector('[data-slot="hint"]'));
      if (actions.has("punchline") || actions.has("structure-hint")) card.classList.add("is-hint");
    }

    // RDBMS
    if (actions.has("show-cylinder")) reveal(card.querySelector('[data-slot="cylinder"]'));
    for (const a of actions) {
      if (a.startsWith("vendor:")) {
        reveal(card.querySelector(`[data-vendor="${a.split(":")[1]}"]`));
      }
    }
    if (actions.has("show-sql-layer")) reveal(card.querySelector('[data-slot="sql-layer"]'));

    // SQL
    if (actions.has("show-products")) {
      reveal(card.querySelector('[data-slot="products"]'));
      card.classList.add("is-products-in");
    }
    if (actions.has("show-prompt")) reveal(card.querySelector('[data-slot="prompt"]'));
    for (const a of actions) {
      if (a.startsWith("sql-line:")) {
        reveal(card.querySelector(`[data-sql="${a.split(":")[1]}"]`));
        card.querySelector('[data-slot="sql"]')?.classList.add("is-in");
      }
      if (a.startsWith("clause:")) {
        reveal(card.querySelector(`.viz-clause[data-i="${a.split(":")[1]}"]`));
      }
    }
    // legacy full sql type
    if (actions.has("sql-type") && scene.sql) {
      scene.sql.forEach((_, i) => reveal(card.querySelector(`[data-sql="${i}"]`)));
      card.querySelector('[data-slot="sql"]')?.classList.add("is-in");
    }
    if (actions.has("results")) {
      const box = card.querySelector('[data-slot="results"]');
      if (box && scene.products) {
        const hits = scene.products.filter((p) => Number(p[2]) > 20).map((p) => p[1]);
        box.innerHTML = hits.map((n) => `<div>${esc(n)}</div>`).join("");
        box.classList.add("is-in");
        card.classList.add("is-filter");
        card.querySelectorAll(".viz-product-row").forEach((row) => {
          const price = Number(row.dataset.price);
          row.classList.toggle("is-dimmed", !(price > 20));
          row.classList.toggle("is-hit", price > 20);
        });
      }
    }

    // Chips / subtitle legacy
    for (const a of actions) {
      if (a.startsWith("subtitle:")) {
        const el = card.querySelector('[data-slot="subtitle"]');
        if (el) {
          el.textContent = a.slice("subtitle:".length);
          reveal(el);
          el.classList.add("is-in");
        }
      }
      if (a.startsWith("chips:")) {
        const el = card.querySelector('[data-slot="chips"]');
        if (el) {
          el.innerHTML = a
            .slice("chips:".length)
            .split("|")
            .map((c) => `<span class="viz-chip">${esc(c)}</span>`)
            .join("");
          reveal(el);
          el.classList.add("is-in");
        }
      }
    }
  }

  function sync(_time, lyricIndex) {
    const scene = sceneAtLyric(lyricIndex);
    const actions = activeActions(scene, lyricIndex, _time);
    const signature = `${scene.id}|${[...actions].sort().join(",")}`;

    if (scene.id !== lastSceneId) {
      renderScene(scene);
      lastSceneId = scene.id;
      lastSignature = "";
    }

    if (signature !== lastSignature) {
      applyActions(scene, actions);
      lastSignature = signature;
    }
  }

  return { sync };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
