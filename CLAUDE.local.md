# Coding buddy — machine-local context (generated, never commit)

This checkout is managed by the coding-buddy pipeline at `/Users/marko/Studio/coding-buddy`.
Regenerate this file: `node /Users/marko/Studio/coding-buddy/src/handoff.js`.

## Knowledge — read before non-trivial work

- `/Users/marko/Studio/coding-buddy/knowledge/plugins/winden-dplugins-tailwind-css-compiler/CODEMAP.md` — what lives where in this plugin
- `/Users/marko/Studio/coding-buddy/knowledge/plugins/winden-dplugins-tailwind-css-compiler/FEATURES.md` — what shipped, task by task
- `/Users/marko/Studio/coding-buddy/knowledge/plugins/winden-dplugins-tailwind-css-compiler/GOTCHAS.md` — what has defeated automation here before
- `/Users/marko/Studio/coding-buddy/knowledge/global` — the mechanisms (gate, security checklist, workflows)
- `/Users/marko/Studio/coding-buddy/knowledge/decisions/ADR-0001-coding-buddy.md` — the design and its rejected alternatives

## Prepared work — check before inventing tasks

- Plans: `/Users/marko/Studio/coding-buddy/.buddy/plans/*.json` — filter for `"plugin": "winden-dplugins-tailwind-css-compiler"`; `status` draft means undecided, approved/running means the pipeline owns it
- Queue: `/Users/marko/Studio/coding-buddy/.buddy/queue.jsonl` — append-only; the last status row per id wins
- History: `/Users/marko/Studio/coding-buddy/.buddy/history.jsonl` — what ran before, with timings

If a plan or queued task already covers what you are about to do, work from its wording — it is the agreed version.

## Rules that bind this checkout

- `buddy/*` branches belong to the pipeline: merge or abandon them through the buddy, never rebase or delete them by hand mid-task.
- Never push `main`, never create or push tags, never touch releases — a pushed tag can deploy to wordpress.org.
- The gate is `node /Users/marko/Studio/coding-buddy/harness/verify.mjs winden-dplugins-tailwind-css-compiler` — run it before calling any change done.
- `knowledge/` records earned evidence; append, don't rewrite. `harness/` is the judge — never edit it from a coding session.
