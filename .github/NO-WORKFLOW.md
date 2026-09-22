# No CI workflow here, and why

This repository has no `.github/workflows`. That is a decision, and this file is
it -- so the absence is on record rather than looking like an oversight.

An empty `.github/workflows` directory is worse than no directory: it reads as a
promise of a check with nothing behind it, and git cannot track an empty
directory anyway, so it is invisible to everyone except whoever is looking at
that working copy. The release tooling refuses on both states by name.

## What this package has to run

- **own specs:** 1 (the native document format's sections, footnotes and mime)
- **scripts:** `build`, `clean`, `lint`, `typecheck`

## Why none of it can run here yet

The same reason as every sibling Angular package, measured when `ui-angular`
was extracted: npm auto-installs peer dependencies, so an **unpublished peer
404s the whole install as hard as a dependency would**. This package declares
four `@coolms/*` peers and none of them is published:

- `@coolms/core-angular`
- `@coolms/ui-angular`
- `@coolms/editor-angular`
- `@coolms/pdf-angular`

With `--legacy-peer-deps` the install succeeds and `lint`, `typecheck` and
`build` then fail on `Cannot find module '@coolms/core-angular'` -- the
workaround moves the failure rather than removing it.

## What does cover this package

Its spec runs in the admin SPA suite, which imports it by path from the
application's own spec bridge (`src/dtmpl-angular-specs.spec.ts`), and the
admin's build compiles these sources directly through a path mapping. The
backend's `make check-fe` also reads this tree: no relative import may cross
the package boundary, and the `--cms-*` tokens it paints are checked against
the theme's definitions.

## What would unblock it

Publishing the `@coolms/*` packages to npm.

## The consequence, stated plainly

Until then this repository has **no gate of its own**: what stands in front of a
change here is the admin's gate, run in the backend checkout where both trees
are visible.
