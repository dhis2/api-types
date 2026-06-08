# Ship GistModel, PickWithFieldFilters, and PagedResponse utility types; omit the rest

## Status

Accepted

## Context and Problem Statement

Several DHIS2 front-end applications have independently built TypeScript utility types to address patterns that repeat across any code that talks to the DHIS2 REST API: paginated responses, the gist endpoint, and `?fields=` query narrowing. As a shared library, `@dhis2/api-types` could ship these utilities so applications don't each maintain their own. The question is which utilities to include, and which to leave out.

## Decision Drivers

- A utility earns its place if it encodes DHIS2-specific knowledge that cannot be trivially expressed by a consumer
- Utilities that only work correctly with resolved concrete types (see ADR 0001) are less valuable here, since this library types references as `IdentifiableObject`, not `CategoryCombo`
- A small, focused public API is easier to keep stable than a large one
- Utilities already easy to write locally (one-line wrappers, standard TypeScript patterns) should stay local

## Utilities found across the ecosystem

The following were discovered in `metadata-management-app` (`dhis2-open-api-ts`) and `capture-app`:

| Utility | Source | Purpose |
|---|---|---|
| `GistModel<T>` | metadata-management-app | Transform a model to its gist-endpoint representation |
| `PickWithFieldFilters<T, Filters>` | metadata-management-app | Narrow a type to exactly the fields in a `?fields=` query |
| `PagedResponse<T, Key>` | metadata-management-app | Type a paginated list response with a resource-specific list key |
| `GistCollectionResponse<T, Key>` | metadata-management-app | Typed gist list response |
| `GistObjectResponse<T>` | metadata-management-app | Typed gist single-object response |
| `GistApiEndpoints<T>` | metadata-management-app | Extract reference fields and map them to string URLs |
| `GetGistResponseForReference<Key, GR>` | metadata-management-app | Resolve a gist link to its response type |
| `GistParams` | metadata-management-app | Typed query parameters for the gist endpoint |
| `GetReferencedModels<T>` | metadata-management-app | Extract reference fields from a model |
| `PickInModelReferences<T, Props>` | metadata-management-app | Apply a field pick to all reference fields |
| `PickReferenceProperties<T>` | metadata-management-app | Pick only reference fields |
| `GetReferencedModelsUnion<T>` | metadata-management-app | Union of all referenced model types |
| `ModelCollection<T>` | metadata-management-app | Named alias for `Array<T>` |
| `PickValue<T, V>` | metadata-management-app | Pick keys whose value type extends `V` |
| `Prettify<T>` | metadata-management-app | Flatten intersections in IDE hover tooltips |

## Considered Options

- **Include `GistModel`, `PickWithFieldFilters`, and `PagedResponse`** — the three utilities with clear value and wide applicability
- **Include all utilities found in the ecosystem** — maximum feature parity with existing app-local solutions
- **Include none** — keep the library focused on raw types only

## Decision Outcome

Chosen option: **Include `GistModel`, `PickWithFieldFilters`, and `PagedResponse`**, because all three address genuine DHIS2 API patterns and provide clear value to consumers. `Prettify<T>` is also exported as a minor bonus — it is the smallest possible utility and directly supports reading the output of the other utilities.

- `GistModel` and `PickWithFieldFilters` encode non-trivial DHIS2-specific logic that cannot be trivially built locally
- `PagedResponse` is structurally simple but earns its place as the universal return shape of every DHIS2 list endpoint — consumers encounter it in every paginated query, making it the single most frequently needed wrapper type

### Positive Consequences

- Consumers get the three most commonly needed API-pattern utilities without pulling in a separate dependency
- All three utilities are version-agnostic generics and work against any version's `components["schemas"]` types
- `GistModel` correctly preserves string enum types (like `AggregationType`) because TypeScript's `object` type excludes string literal unions
- `PagedResponse` composes naturally with `PickWithFieldFilters` — declare fields once, pass the narrowed type as `T`

### Negative Consequences

- `PickWithFieldFilters` has a documented limitation: nested picks only resolve fields present on the declared type. Because references are typed as `IdentifiableObject` rather than concrete types, deep nesting (e.g. `categoryCombo[categories[id,name]]`) silently drops unknown fields instead of erroring
- The limitation means `PickWithFieldFilters` is most useful for flat picks and first-level nesting within `IdentifiableObject`'s own fields (`id`, `name`, `code`, `href`, etc.)

## Pros and Cons of the Options

### Include `GistModel`, `PickWithFieldFilters`, and `PagedResponse`

- Good, because all three address genuine DHIS2 API patterns
- Good, because `GistModel` works correctly regardless of reference style — it transforms whatever type is there
- Good, because `PickWithFieldFilters` remains useful for flat picks and shallow nesting even with `IdentifiableObject` references
- Good, because neither `GistModel` nor `PickWithFieldFilters` is trivial to write correctly: `GistModel` requires careful handling of optional modifiers; `PickWithFieldFilters` requires recursive template literal parsing
- Good, because `PagedResponse` provides an immediately familiar return type for every paginated query — the most common fetch pattern in DHIS2 apps
- Good, because `PagedResponse<T, Key>` composes cleanly: the key serves as both the resource name and the type discriminator
- Bad, because `PickWithFieldFilters` silently drops deeply nested fields that don't exist on `IdentifiableObject`

### Include all utilities

- Good, because consumers don't have to implement any of them locally
- Bad, because most remaining utilities were designed for the resolved-reference style and are misleading or incorrect with `IdentifiableObject` types:
  - `GetReferencedModels<T>` extracts reference fields, but all references resolve to `IdentifiableObject`, making the output uniformly `IdentifiableObject` rather than the distinct concrete types
  - `GistApiEndpoints<T>` maps reference fields to string URLs — meaningful when `categoryCombo` is `CategoryCombo`, less so when it's `IdentifiableObject`
  - `GetGistResponseForReference` resolves gist link chains — not useful without concrete reference types
  - `PickInModelReferences` applies a pick to all reference fields — again assumes distinct types per reference
- Bad, because `PagedResponse<T, Key>` is a one-line type alias with no DHIS2-specific logic; consumers write this trivially
- Bad, because `GistParams`, `GistCollectionResponse`, `GistObjectResponse` add scope without enough benefit to justify maintenance
- Bad, because `ModelCollection<T>` is `Array<T>` by another name
- Bad, because `PickValue<T, V>` is a generic TypeScript pattern with no DHIS2 specificity

### Include none

- Good, because the library stays strictly a raw-types package
- Bad, because `GistModel` and `PickWithFieldFilters` require non-trivial type-level logic that each application currently reimplements independently

## Why specific utilities were excluded

**`GistCollectionResponse`, `GistObjectResponse`, `GistApiEndpoints`, `GetGistResponseForReference`** — these model gist link traversal. They are useful with resolved references (where `categoryCombo` is `CategoryCombo`) but add little value when references are `IdentifiableObject`.

**`GistParams`** — consumers using `openapi-fetch` get typed query parameters from `paths["/api/dataElements"]["get"]["parameters"]` already. A separate interface adds little.

**`GetReferencedModels<T>`, `PickInModelReferences<T, Props>`, `PickReferenceProperties<T>`, `GetReferencedModelsUnion<T>`** — all designed to enumerate and operate on distinct reference types. With `IdentifiableObject` as the universal reference type, they would return uniform output and lose their purpose.

**`ModelCollection<T>`** — `Array<T>` alias. Named aliases for built-in generics belong in application code, not in a shared library.

**`PickValue<T, V>`** — generic TypeScript building block with no DHIS2-specific meaning. Standard TypeScript, not worth exporting.

**`Prettify<T>`** — exported as a minor convenience. It is small, has zero maintenance cost, and directly improves the readability of types produced by `GistModel` and `PickWithFieldFilters` in IDE hover tooltips.
