# Derive query response types automatically with DeriveResourceTypeMap and InferQueryResult

## Status

Accepted

## Context and Problem Statement

DHIS2 front-end applications almost always fetch data via the `@dhis2/app-runtime` `useDataQuery` hook, which takes a query object at runtime and returns a typed response. Without type inference, callers must either write the response type by hand (error-prone), cast to `any` (unsafe), or accept a generic `unknown` result (no IDE support).

The DHIS2 REST API has a stable, machine-readable structure: list endpoints at `/api/{resource}/` return a paginated body `{ pager: ..., [resource]: Item[] }`. The OpenAPI spec describes every one of these endpoints, including the item schema. The question is whether and how to expose that structure as a TypeScript type-level map that callers can use to get precise response types from their query objects.

## Decision Drivers

- Callers should get specific response types from a query object without writing them by hand
- Field filters (`?fields=id,name,valueType`) should narrow the item type to exactly the requested fields
- The solution must work across all supported DHIS2 versions (v40–v43) despite the path prefix difference (`/resource/` vs `/api/resource/`)
- Tracker endpoints return opaque types in the spec and must be handled gracefully (resolve to `unknown`, not a compile error)
- The implementation must not require changes to generated files in `src/`

## Considered Options

- **`DeriveResourceTypeMap<P>` + `InferQueryResult<Q, Map>`** — auto-derive a resource→item map from the `paths` type, then infer the full response type from a query object and the map
- **Hand-written resource map** — ship a concrete `ResourceMap` type alias in `utils.d.ts` for each supported version, updated whenever the spec changes
- **No query type inference** — leave response typing to callers; document the manual pattern

## Decision Outcome

Chosen option: **`DeriveResourceTypeMap<P>` + `InferQueryResult<Q, Map>`**, because it requires zero maintenance (the map is always consistent with the spec) and covers all metadata endpoints automatically across all versions.

The hand-written map was rejected because it would require manual updates whenever a new version is added or an endpoint changes, defeating the purpose of code generation.

No inference was rejected because it leaves an important, repeated typing problem unsolved for every application that uses `app-runtime`.

### Positive Consequences

- Resource→item map is always derived from the current spec; no manual upkeep
- Works with all four supported DHIS2 versions out of the box
- Field filters narrow the item type precisely using the existing `PickWithFieldFilters` utility
- Tracker and other opaque-response endpoints resolve to `unknown` (safe) rather than failing
- Callers can extend the map for tracker resources without modifying `utils.d.ts`

### Negative Consequences

- TypeScript must evaluate large `paths` types to build the map; compile time increases slightly for types files that use `DeriveResourceTypeMap<paths>`
- Tracker resource types require a manual map extension; they cannot be auto-derived from the spec

## Implementation notes

### `DeriveResourceTypeMap<P>`

Inspects every `GET /resource/` and `GET /api/resource/` endpoint in the `paths` type and maps the resource name to the item element type in its `200` JSON response body. Multi-segment paths (`tracker/enrollments`), path-parameter paths (`/api/{uid}`), and fragment variants are excluded via `ExtractListResource<P>`.

```ts
export type DeriveResourceTypeMap<P> = FilterNever<{
    [K in string & keyof P as ExtractListResource<K>]:
        ExtractItemType<GetListBody<P[K]>>
}>
```

Tracker endpoints (`tracker/enrollments`, etc.) return opaque `Page` objects in the spec; `ExtractItemType` returns `never` for them, and `FilterNever` removes those keys from the map. Callers that need tracker types can extend the map manually:

```ts
type MyMap = DeriveResourceTypeMap<paths> & {
    "tracker/enrollments": components["schemas"]["TrackerEnrollment"]
}
```

### `InferQueryResult<Q, Map>`

Maps each key in a query object to its `PagedResponse<Item, ResourceKey>` type, using `InferQueryEntry` for per-entry resolution. The `Map[R] extends infer ItemType` indirection forces resolution of the indexed access type before `PickWithFieldFilters` is applied — without it, TypeScript cannot evaluate `keyof ItemType` inside the conditional branches.

### `PickWithFieldFilters` and deferred mapped types

The largest implementation challenge was making `PickWithFieldFilters<ItemType, F>` work when `ItemType` is a lazily-resolved indexed access type (e.g. `V43Map["dataElements"]`) rather than a concrete alias.

Two TypeScript behaviours interact here:

1. **Conditional branches cannot eagerly evaluate `keyof T`** for an indexed-access type. `S extends keyof Map[R]` fails when `Map[R]` is not yet resolved; the workaround is `{ [K in keyof Map[R] as K extends S ? K : never]: Map[R][K] }`, which defers `keyof` to property-access time.

2. **`UnionToIntersection` of deferred homomorphic mapped types collapses to `never`**. If `TFieldFilters[number]` is a union `"id" | "name" | "valueType"`, distributing over it produces three separate deferred mapped types, and their intersection via `UnionToIntersection` fails. The fix is to use a **single mapped type** that tests all filter keys at once: `{ [K in keyof TModel as K extends AllFilterKeys ? K : never]: TModel[K] }`.

3. **Comma-split filter strings** (`"id,name,valueType"` as a single array entry) must be expanded before the key-set test. `ExtractKeys<S>` recursively splits on commas so that `["id,name,valueType"]` and `["id", "name", "valueType"]` produce the same result type.

4. **`DeriveResourceTypeMap` can produce optional-valued properties** when multiple path keys in the spec remap to the same resource name. Using `NonNullable<TModel>` inside `PickWithFieldFilters` strips the `| undefined` before picking.
