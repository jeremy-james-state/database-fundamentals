/**
 * Client-side docs search for mint dev / offline use.
 * Does not replace Mintlify's ⌘K modal — use the Local search page (/search).
 *
 * Note: Mintlify evaluates snippet exports in a sandbox. Helpers used by the
 * component must live inside the export (top-level functions are out of scope).
 */

export const LocalSearch = ({ index = [] }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scorePage = (page, tokens) => {
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
  };

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const results =
    tokens.length === 0
      ? []
      : index
          .map((page) => ({ page, score: scorePage(page, tokens) }))
          .filter((row) => row.score > 0)
          .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
          .slice(0, 40);

  return (
    <div className="not-prose my-4 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-950 dark:text-white">
          Search pages
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try SELECT, primary key, join…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-950/15 bg-white px-3 py-2.5 text-base text-zinc-950 outline-none ring-0 placeholder:text-zinc-950/40 focus:border-zinc-950/40 dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/40"
        />
      </label>

      {tokens.length === 0 ? (
        <p className="text-sm text-zinc-950/60 dark:text-white/60">
          Matches titles, descriptions, keywords, and section headings from the local
          index ({index.length} pages).
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-950/60 dark:text-white/60">
          No matches for “{query.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-950/10 rounded-lg border border-zinc-950/10 dark:divide-white/10 dark:border-white/10">
          {results.map(({ page }) => (
            <li key={page.href}>
              <a
                href={page.href}
                className="block px-3 py-3 no-underline transition-colors hover:bg-zinc-950/[0.04] dark:hover:bg-white/[0.04]"
              >
                <div className="font-medium text-zinc-950 dark:text-white">
                  {page.title}
                </div>
                {page.description ? (
                  <div className="mt-0.5 text-sm text-zinc-950/65 dark:text-white/65">
                    {page.description}
                  </div>
                ) : null}
                <div className="mt-1 font-mono text-xs text-zinc-950/45 dark:text-white/45">
                  {page.href}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
