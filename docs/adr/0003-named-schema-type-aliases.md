# Generate named schema type aliases alongside the namespace output

## Status

Accepted

## Context and Problem Statement

The `openapi-typescript` generator wraps all schema types inside a `components["schemas"]` namespace. Consuming a type requires a two-step pattern: import the namespace, then alias the type locally.

```ts
// Without named exports
import type { components } from "@dhis2/api-types/v43"
type DataElement = components["schemas"]["DataElement"]
```

Other approaches in the DHIS2 ecosystem (notably `dhis2-open-api-ts` used in `metadata-management-app`) export types directly by name:

```ts
import type { DataElement } from "@dhis2mma/types"
```

The question is whether this library should offer a similar experience, and if so, how — given that the generated files must stay low-maintenance and accurate.

## Decision Drivers

- Consumer ergonomics: named imports are discoverable via IDE autocomplete and match standard TypeScript package conventions
- Maintenance: any solution must work automatically for all versions and require no manual updates when new DHIS2 versions are added
- Accuracy: named aliases must be semantically identical to `components["schemas"]["X"]` — no resolved references, no changed optionality
- Backward compatibility: existing code using `components["schemas"]` must continue to work

## Considered Options

- **Append generated named aliases to the existing `vN.d.ts`** — add a post-processing step to `generate.ts` that reads schema names from the spec and emits one `export type X = components["schemas"]["X"]` line per schema
- **Separate entry point per version** — generate a `vN-schemas.d.ts` file and expose it at `@dhis2/api-types/schemas/v43`, leaving the existing `vN.d.ts` unchanged
- **Do nothing** — require consumers to alias types themselves, as documented in the README

## Decision Outcome

Chosen option: **Append generated named aliases to the existing `vN.d.ts`**, because it requires the fewest moving parts, imposes zero maintenance burden, and gives consumers a standard import experience without changing the library's entry points.

The implementation is ~10 lines added to `generate.ts`:

```ts
const schemaNames = Object.keys(spec.components?.schemas ?? {})
const aliases = schemaNames
    .map((name) => `export type ${name} = components["schemas"]["${name}"]`)
    .join("\n")
```

These aliases are appended after the `openapi-typescript` output in each generated file. Consumers may use either style interchangeably:

```ts
import type { DataElement } from "@dhis2/api-types/v43"                      // named
type DataElement = components["schemas"]["DataElement"]                        // namespace — identical
```

### Positive Consequences

- Standard import experience — `import type { DataElement, Event, Program }` works out of the box
- IDE autocomplete lists all available schema types when typing a named import
- Zero maintenance: aliases are generated from the spec at each `npm run generate` run; adding a new DHIS2 version automatically includes that version's named exports
- Fully backward compatible — `components["schemas"]` continues to work
- Semantically identical — the aliases are thin wrappers, not resolved types; accuracy from ADR 0001 is fully preserved
- No new entry points, no package.json configuration changes

### Negative Consequences

- Each version exports ~900 named types — IDE autocomplete in an `import { }` statement shows every schema including internal variants (`UID_DataElement`, `DataElementParams`, `WebapiControllerTrackerView_*`) at the same level as `DataElement`
- Schema count grows between versions (v40: 547, v43: 921) — the named surface of the library grows with each DHIS2 release
- Commonly named types like `Event`, `Program`, `User` are now module-level exports; consumers who import `Event` from this library shadow the DOM `Event` in type-only scope (harmless in practice since `import type` cannot affect runtime globals, but may cause confusion in code review)

## Approaches not taken

### Separate entry point (`@dhis2/api-types/schemas/v43`)

Generating a `vN-schemas.d.ts` alongside the main `vN.d.ts` and exposing it at a dedicated path would keep the two concerns (namespace types, named types) separate. Consumers who only need named types wouldn't load the full namespace.

Rejected because:
- Requires a new `exports` + `typesVersions` entry per version in `package.json`
- Consumers must know about two entry points and choose between them
- The full generated file is already large; splitting it into a second file adds complexity without a meaningful size benefit (the aliases are one line each, a small fraction of total file size)
- The primary benefit — keeping the main entry point clean — is not compelling enough given that named exports coexist harmlessly with the namespace exports

### Do nothing

Documenting the `type DataElement = components["schemas"]["DataElement"]` pattern in the README is the status quo. It requires no code changes and avoids all the namespace-noise concerns above.

Rejected because the ergonomic gap is real: consumers accustomed to `import { DataElement }` from any other TypeScript package would find the namespace pattern surprising, and the alias would need to be repeated in every file that uses the type. The manual one-liner per type scales poorly for applications that work with many DHIS2 schemas.

## Tradeoffs summary

| Concern | Impact |
|---|---|
| Consumer ergonomics | Significantly improved — standard `import { X }` works |
| IDE autocomplete noise | ~900 names per version including non-primary types |
| Maintenance cost | Zero — fully automated |
| Semantic accuracy | Unchanged — aliases are exact, no reference resolution |
| Backward compatibility | Full — existing code unaffected |
| Package entry points | Unchanged — no new configuration needed |
| `Event`, `User`, etc. name overlap | Exists but harmless in `import type` context |
