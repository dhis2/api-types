# CLAUDE.md

## What this repo is

`@dhis2/api-types` is a TypeScript types package for the DHIS2 REST API. Types are generated automatically from the official DHIS2 OpenAPI specification using `openapi-typescript`. Never hand-edit files in `src/` — they are generated outputs.

## Key design decisions

- Types are generated directly from the OpenAPI spec without resolving `$ref` references. Nested objects are typed as their spec-declared shape (e.g. `IdentifiableObject`), not the concrete type they point to. This is intentional — see [ADR 0001](docs/adr/0001-openapi-generated-types-over-resolved-types.md).
- Every schema in the spec is exported as a named type alias from the version entry point (e.g. `export type DataElement = components["schemas"]["DataElement"]`). These are generated automatically by `generate.ts` and appended to each `vN.d.ts` file. See [ADR 0003](docs/adr/0003-named-schema-type-aliases.md).
- The last **four** DHIS2 API versions are supported at any time (currently v40–v43).
- The root export `@dhis2/api-types` always resolves to the latest version via `src/latest.d.ts`.
- `@dhis2/api-types/utils` exports `GistModel<T>`, `PickWithFieldFilters<T, Filters>`, `PagedResponse<T, Key>`, and `Prettify<T>` — version-agnostic utility types. `src/utils.d.ts` is hand-written and must not be regenerated. See [ADR 0002](docs/adr/0002-utility-types-gistmodel-and-pickwithfieldfilters.md) for why only these are included.

## Versions

Supported versions and their spec URLs are in [scripts/versions.ts](scripts/versions.ts). The package version major tracks the latest DHIS2 version (currently `43.x.y`).

### Adding a new DHIS2 version

1. Add an entry to `scripts/versions.ts`
2. Add the new version to `package.json` `exports` and `typesVersions`; remove the oldest
3. Update `src/latest.d.ts` to re-export the new version
4. Update the file existence check in `.github/workflows/publish.yml`
5. Run `npm run update`

## npm scripts

```sh
npm run fetch-specs              # fetch OpenAPI specs from DHIS2 Play servers → specs/vN.json
npm run generate                 # generate types from specs → src/vN.d.ts
npm run update                   # fetch-specs + generate (full refresh)
npm run typecheck                # tsc check on scripts + type tests

# Target a single version
npm run fetch-specs -- --version v43 --force
npm run generate -- --version v43
```

## Spec patching

The v42 spec has a bug: some parameters reference `GetObjectListParams.filters` and `GetObjectListParams.orders` (plural) but the components only define the singular forms. `generate.ts` patches these with string replacement before parsing. If similar broken `$ref` errors appear for other versions, apply the same pattern in `generate.ts`.

## Type tests

Type tests live in `tests/vN/` and are plain TypeScript files — no test runner, no extra dependencies. They are checked by `tsc -p tsconfig.tests.json` as part of `npm run typecheck`.

- `tests/v43/data-element.ts` — aggregate model (`DataElement`)
- `tests/v43/tracker.ts` — tracker models (`TrackerTrackedEntity`, `TrackerEnrollment`, `Event`)

Test files import via the package name (`@dhis2/api-types/v43`), which `tsconfig.tests.json` maps to the local `src/` files using `paths`. This means test imports look exactly like consumer imports.

### Writing type tests

Use `// @ts-expect-error` to assert that an assignment should fail. The directive only suppresses the error on the **immediately following line** — for multi-line objects, place it directly before the bad field, not before the `const` declaration. Also note: any comment containing the text `@ts-expect-error` is treated as a live directive, not documentation.

```ts
// ✓ correct — directive is on the line before the erroring line
const bad: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
    // @ts-expect-error
    zeroIsSignificant: "yes",
}

// ✗ wrong — directive covers the const declaration, not the inner field
// @ts-expect-error
const bad: DataElement = {
    ...
    zeroIsSignificant: "yes",   // error is here, not on the line above
}
```

## Project structure

```
scripts/
  versions.ts        # list of supported DHIS2 versions and their spec URLs
  fetch-specs.ts     # fetches OpenAPI specs from DHIS2 Play servers
  generate.ts        # generates src/vN.d.ts from specs/vN.json
specs/
  vN.json            # OpenAPI spec snapshots (committed)
src/
  vN.d.ts            # generated: openapi-typescript output + named schema aliases — do not edit
  latest.d.ts        # re-exports the latest version; update when adding a new version
  utils.d.ts         # hand-written utility types — version-agnostic generics, do not regenerate
tests/
  v40/
    utils.ts         # verifies GistModel + PickWithFieldFilters compile against v40 types
  v43/
    data-element.ts  # type tests for aggregate metadata (DataElement)
    tracker.ts       # type tests for tracker models
    utils.ts         # type tests for GistModel and PickWithFieldFilters
docs/
  adr/               # Architecture Decision Records (MADR format)
.github/
  workflows/
    publish.yml      # publishes to npm on a vN.N.N tag
    regenerate.yml   # monthly cron: re-fetches specs and opens a PR if anything changed
```

## Utility types (`src/utils.d.ts`)

`@dhis2/api-types/utils` exports `GistModel<T>`, `PickWithFieldFilters<T, Filters>`, `PagedResponse<T, Key>`, and `Prettify<T>`. These are version-agnostic generics — a single export that works with types from any version:

```ts
import type { components } from "@dhis2/api-types/v40"  // or v41, v42, v43
import type { GistModel, PagedResponse } from "@dhis2/api-types/utils"

type DEGist = GistModel<components["schemas"]["DataElement"]>
type DataElementsPage = PagedResponse<components["schemas"]["DataElement"], "dataElements">
```

`src/utils.d.ts` is hand-written. Do not regenerate or overwrite it as part of `npm run generate`. It should be updated manually when the utility types need to change.

## Adding type tests for a new version

When adding v44, create `tests/v44/` with at least:
- `data-element.ts` — test an aggregate metadata type
- `tracker.ts` — test the tracker event/enrollment types
- `utils.ts` — verify `GistModel`, `PickWithFieldFilters`, and `PagedResponse` compile against the new version's types

Also add the new version path to `tsconfig.tests.json`'s `paths` map.
