# Scripts

## Local search index

Mintlify’s ⌘K search bar is Mintlify-owned. In `mint dev` it needs `mint login`, and even then it talks to Mintlify’s hosted index (same content as the deployed site)—not a pure offline filesystem index.

This repo adds a **Local search** page at `/search` that scores titles, descriptions, keywords, and `##` headings from navigable MDX.

```bash
# from repo root
node scripts/build-search-index.mjs
mint dev
# open http://localhost:3000/search
```

Outputs:

- `search-index.json` — inspectable JSON
- `snippets/search-data.jsx` — imported by `search.mdx`

Re-run the script after you add pages or change frontmatter keywords.
