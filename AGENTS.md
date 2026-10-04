# Documentation project instructions

## About this project

- This is the **Database Fundamentals** documentation site, built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Site config lives in `docs.json`
- Use the Mintlify admin MCP (`https://mcp.mintlify.com`) to edit content and settings
- Use the Mintlify docs MCP (`https://www.mintlify.com/docs/mcp`) to look up Mintlify itself
- Follow the local Mintlify skills under `.agents/skills/`

## Terminology

- Address the reader as **you**
- Prefer concrete SQL/data terms: **table**, **row**, **column**, **primary key**, **query**
- Say **database** only when you mean the whole system, not a single table
- Prefer **schema** for structure; do not use **model** unless you mean an ORM or conceptual model
- Do not invent product names, dialects, or vendor features that are not in the page

## Style preferences

- Use active voice and second person
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Lead with the outcome, then the steps
- No marketing language, filler, or “simply / just / easily”

## Content boundaries

- Document database fundamentals for learners: concepts, SQL, modeling, and practice
- Do not document Mintlify, Cursor, or this repo’s tooling on product pages
- Do not document vendor-specific DBA operations, hosting, or billed cloud consoles unless a page is explicitly about that vendor
- Do not add pages that exist only to showcase Mintlify components

## Page conventions

- Every MDX page starts with YAML frontmatter: `title` and `description`
- File names are kebab-case: `primary-keys.mdx`
- Internal links are root-relative and have no extension: `/quickstart`
- New lessons must be added to a visible group in `docs.json` or they stay hidden
- `/templates/` is listed in a `hidden: true` group. Do not unhide it. Do not link it from lessons. Copy a template, then add the new file to a visible group.
- Store images in `/images` and wrap them in `<Frame>` with descriptive alt text
- Use `<Steps>` for procedures, `<Tabs>` for alternatives, `<CodeGroup>` for the same example in multiple languages
- Start every new lesson from `/templates/` (how-to, tutorial, explanation, or reference). Copy the matching template. Do not invent a page shape.
- The Templates group stays in `docs.json` with `hidden: true`. Learners never see it in the sidebar, search, or AI chat. You still read those files and use them as the source of page structure.
- Code blocks always include a language tag
- Mark unknowns with `{/* TODO: ... */}` instead of guessing

## Ship path

- Write real content on a branch and open a pull request into `main`
- Do not push lesson content straight to `main` unless the user asks
- A merge to `main` deploys the Mintlify site
- After content edits, run `mint validate` and `mint broken-links` before you consider the work done
