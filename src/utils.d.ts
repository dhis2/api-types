/**
 * Utility types for working with DHIS2 API responses.
 *
 * Import from "@dhis2/api-types/utils" — these are version-agnostic and
 * work with types from any supported DHIS2 version.
 */

// ── Internal helpers (not exported) ──────────────────────────────────────────

/** Strip spaces from a string literal type so "id, name" equals "id,name". */
type RemoveSpaces<S extends string> = S extends `${infer A} ${infer B}`
    ? RemoveSpaces<`${A}${B}`>
    : S

/** Convert a union to an intersection: A | B | C → A & B & C. */
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends
    (x: infer I) => void
    ? I
    : never

/**
 * Unwrap arrays to their element type, and strip undefined/null.
 * Used so the recursive picker can operate on the inner element type.
 */
type GetModel<T> = NonNullable<T extends Array<infer U> ? U : T>

/**
 * Core recursive engine for PickWithFieldFilters.
 *
 * Handles three cases (in order):
 *   1. Nested:      "categoryCombo[id,name]"
 *   2. Comma-split: "id,name,valueType"  (finds first key-matching prefix)
 *   3. Plain key:   "id"
 *
 * Nested fields are always marked optional (`?`) — field-filtered responses
 * are inherently partial, and the field may be absent if the API omits it.
 */
type RecursivePickWithFieldFilter<Model, S extends string> =
    // Escape hatch: if S is the generic `string` type (not a literal), return the full model
    string extends S
        ? Model
    : S extends ''
        ? never
    // Case 1 — nested: "field[nested,filters]"
    // Use `?` so the picked field is optional — DHIS2 may omit absent values.
    // Split array vs non-array so the element type is correctly narrowed.
    : S extends `${infer Root extends string & keyof Model}[${infer Nested}]`
        ? [NonNullable<Model[Root]>] extends [unknown[]]
            ? { [K in Root]?: Array<Prettify<RecursivePickWithFieldFilter<GetModel<NonNullable<Model[Root]>>, Nested>>> }
            : { [K in Root]?: Prettify<RecursivePickWithFieldFilter<GetModel<NonNullable<Model[Root]>>, Nested>> }
    // Case 2 — comma-split: TypeScript finds the shortest prefix T that is a key of Model
    : S extends `${infer T extends string & keyof Model},${infer U}`
        ? Pick<Model, T> & RecursivePickWithFieldFilter<Model, U>
    // Case 3 — plain key.
    // Use a remapped mapped type rather than `S extends keyof Model ? Pick<Model, S> : never`
    // because TypeScript cannot eagerly evaluate `keyof Model` for indexed-access types
    // (e.g. `V43Map["dataElements"]`) inside a conditional branch. The mapped-type form
    // defers `keyof Model` resolution to when a property is actually accessed, which works
    // even for lazily-resolved types. Optionality is preserved because the source is
    // `keyof Model` (homomorphic form).
    : { [K in keyof Model as K extends S ? K : never]: Model[K] }

// ── Internal: query inference helpers ────────────────────────────────────────

/**
 * Extract the resource name from an OpenAPI path string.
 *
 * Handles both path prefixes used across DHIS2 API versions:
 *   - v40/v41: /dataElements/        (no /api/ prefix)
 *   - v42/v43: /api/dataElements/    (with /api/ prefix)
 *
 * Returns `never` for paths that are not simple list endpoints:
 *   - /api/dataElements/{uid}        (path parameters)
 *   - /api/dataElements/#getListCsv  (fragment variants)
 *   - /api/tracker/enrollments/      (multi-segment — tracker excluded by design)
 */
type ExtractListResource<P extends string> =
    P extends `/api/${infer R}/`
        ? R extends `${string}/${string}` ? never
        : R extends `${string}{${string}}` ? never
        : R extends `${string}#${string}` ? never
        : R
    : P extends `/${infer R}/`
        ? R extends `${string}/${string}` ? never
        : R extends `${string}{${string}}` ? never
        : R extends `${string}#${string}` ? never
        : R
    : never

/**
 * Extract the 200 JSON response body from a path entry's GET operation.
 * Returns `never` if the path has no GET, no 200 response, or the body is not
 * a plain object (e.g. `unknown`, `string` — used by some tracker endpoints).
 */
type GetListBody<PathEntry> =
    PathEntry extends {
        get: { responses: { 200: { content: { "application/json": infer Body } } } }
    }
        ? Body extends Record<string, unknown> ? Body : never
        : never

/**
 * Extract the item type from a paged list response body.
 * The body shape is `{ pager?: ...; resourceKey?: Item[] }`.
 * Returns the element type of the non-pager array field, or `never` if none.
 */
type ExtractItemType<Body> = {
    [K in keyof Body]: K extends "pager" ? never :
        NonNullable<Body[K]> extends (infer Item)[] ? Item : never
}[keyof Body]

/** Remove keys whose value is `never` from a mapped type. */
type FilterNever<M> = { [K in keyof M as [M[K]] extends [never] ? never : K]: M[K] }

/**
 * Extract the last segment of a resource path.
 * Used to derive the response array key from a resource string.
 *   "dataElements"       → "dataElements"
 *   "tracker/enrollments" → "enrollments"
 */
type LastSegment<S extends string> = S extends `${string}/${infer Last}` ? Last : S

// ── Internal: Pager ──────────────────────────────────────────────────────────

/**
 * DHIS2 pager object returned by all list endpoints.
 * `prevPage` and `nextPage` are only present when adjacent pages exist.
 */
type Pager = {
    page: number
    pageCount: number
    total: number
    pageSize: number
    prevPage?: string
    nextPage?: string
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Force TypeScript to evaluate and display an intersection as a flat object.
 * Useful for making complex computed types readable in IDE hover tooltips.
 *
 * @example
 * type Result = Prettify<Pick<DataElement, "id"> & { name?: string }>
 * // Displays as: { id?: string; name?: string }
 * // Instead of: Pick<DataElement, "id"> & { name?: string }
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & unknown

/**
 * Model type for the DHIS2 `/api/*.json?type=gist` endpoint.
 *
 * The gist endpoint collapses the response to reduce payload size:
 * - **Array fields** (collections) become `number` — the total count
 * - **Object fields** (references and embedded objects) become `string` — the href or serialised value
 * - **Scalar fields** (string, number, boolean, enum) are unchanged
 *
 * ```ts
 * import type { components } from "@dhis2/api-types/v43"
 * import type { GistModel } from "@dhis2/api-types/utils"
 *
 * type DataElement = components["schemas"]["DataElement"]
 * type DataElementGist = GistModel<DataElement>
 *
 * // dataElementGroups: number[]  →  number  (count)
 * // categoryCombo: IdentifiableObject  →  string  (href)
 * // name: string  →  string  (unchanged)
 * // aggregationType: AggregationType  →  AggregationType  (unchanged — string literal union)
 * ```
 *
 * > **Note:** Object detection uses TypeScript's structural `object` type, which
 * > captures all non-primitive values — including both reference objects (like
 * > `IdentifiableObject`) and embedded value objects (like `Access`, `Sharing`).
 * > This accurately reflects the gist endpoint's behaviour of collapsing all
 * > nested structures. String literal union enums (e.g. `AggregationType`) are
 * > primitives and are correctly left unchanged.
 */
export type GistModel<T> = {
    [K in keyof T]: NonNullable<T[K]> extends unknown[]
        ? Extract<T[K], undefined> | number
        : NonNullable<T[K]> extends object
        ? Extract<T[K], undefined> | string
        : T[K]
}

/**
 * Type for a paginated DHIS2 list endpoint response.
 *
 * DHIS2 list endpoints return a `pager` object alongside the resource array,
 * keyed by the resource name (e.g. `dataElements`, `trackedEntities`).
 *
 * ```ts
 * import type { DataElement } from "@dhis2/api-types"
 * import type { PagedResponse } from "@dhis2/api-types/utils"
 *
 * type DataElementsPage = PagedResponse<DataElement, "dataElements">
 * // → {
 * //     pager: { page: number; pageCount: number; total: number; pageSize: number }
 * //     dataElements: DataElement[]
 * //   }
 * ```
 *
 * Combine with `PickWithFieldFilters` to narrow the item type to exactly the
 * fields requested:
 *
 * ```ts
 * type DataElementRow = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>
 * type DataElementsPage = PagedResponse<DataElementRow, "dataElements">
 * ```
 */
export type PagedResponse<T, Key extends string> =
    { pager: Pager } & { [K in Key]: T[] }

/**
 * Auto-derive a resource → item type map from an OpenAPI `paths` object.
 *
 * Inspects every `GET /resource/` (or `GET /api/resource/`) endpoint in the spec
 * and maps the resource name to the item type in its paginated response body.
 * Covers all DHIS2 metadata endpoints automatically across all supported versions.
 *
 * Tracker endpoints (`tracker/enrollments`, `tracker/events`, etc.) are **not**
 * included — the spec types their responses opaquely and the item type cannot be
 * derived. Supplement with a hand-written intersection if tracker inference is needed:
 *
 * ```ts
 * import type { paths, TrackerEnrollment, TrackerTrackedEntity, Event } from "@dhis2/api-types/v43"
 * import type { DeriveResourceTypeMap } from "@dhis2/api-types/utils"
 *
 * type MyMap = DeriveResourceTypeMap<paths> & {
 *     "tracker/enrollments": TrackerEnrollment
 *     "tracker/trackedEntities": TrackerTrackedEntity
 *     "tracker/events": Event
 * }
 * ```
 */
export type DeriveResourceTypeMap<P> = FilterNever<{
    [K in string & keyof P as ExtractListResource<K>]:
        ExtractItemType<GetListBody<P[K]>>
}>

/**
 * Infer the response type for an app-runtime query object.
 *
 * Pass the query `as const` and a resource map (from `DeriveResourceTypeMap` or
 * a custom map). Resources present in the map are fully typed with `PagedResponse`;
 * unknown resources resolve to `unknown`.
 *
 * For field narrowing, declare `fields` as a `readonly string[]` literal — use
 * `as const` on the array, NOT `.join(",")` (which erases the literal type):
 *
 * ```ts
 * import type { paths } from "@dhis2/api-types/v43"
 * import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"
 *
 * const query = {
 *     dataElements: {
 *         resource: "dataElements",
 *         params: { fields: ["id", "name", "valueType"] as const },
 *     },
 * } as const
 *
 * type Result = InferQueryResult<typeof query, DeriveResourceTypeMap<paths>>
 * // → {
 * //     dataElements: {
 * //         pager: Pager
 * //         dataElements: { id?: string; name?: string; valueType?: ValueType }[]
 * //     }
 * //   }
 * ```
 *
 * **Tracker resources** resolve to `unknown` with the auto-derived map.
 * Extend the map manually to cover them (see `DeriveResourceTypeMap` docs).
 *
 * **App-runtime integration:** today, pass the inferred type as the explicit generic:
 * `useDataQuery<InferQueryResult<typeof query, Map>>(query)`.
 * A future app-runtime change could make it the default, removing the annotation entirely.
 */
type InferQueryEntry<Entry, Map extends Record<string, unknown>> =
    Entry extends { resource: infer R extends string & keyof Map }
        ? Map[R] extends infer ItemType
            ? Entry extends { params: { fields: infer F extends readonly string[] } }
                ? PagedResponse<PickWithFieldFilters<ItemType, F>, LastSegment<R>>
                : PagedResponse<ItemType, LastSegment<R>>
            : never
        : unknown

export type InferQueryResult<
    Q extends Record<string, { resource: string }>,
    Map extends Record<string, unknown>
> = {
    [K in string & keyof Q]: InferQueryEntry<Q[K], Map>
}

// ── PickWithFieldFilters helpers ──────────────────────────────────────────────

/**
 * Separate flat field names ("id", "name") from nested specs ("categoryCombo[id,name]").
 * Flat fields do NOT contain "["; nested fields do.
 */
type ExtractFlatField<S extends string> = S extends `${string}[${string}` ? never : S
type ExtractNestedField<S extends string> = S extends `${string}[${string}` ? S : never

/**
 * Extract individual key names from a possibly comma-split field string.
 * "id,name,valueType" → "id" | "name" | "valueType"
 * "id" → "id"
 */
type ExtractKeys<S extends string> = S extends `${infer K},${infer Rest}` ? K | ExtractKeys<Rest> : S

/**
 * Pick fields from a model using DHIS2's `?fields=` filter syntax.
 *
 * Each entry in the `TFieldFilters` array corresponds to one field specifier.
 * Use bracket notation for nested fields: `"categoryCombo[id,displayName]"`.
 *
 * ```ts
 * import type { components } from "@dhis2/api-types/v43"
 * import type { PickWithFieldFilters } from "@dhis2/api-types/utils"
 *
 * type DataElement = components["schemas"]["DataElement"]
 *
 * // Flat pick — mirrors ?fields=id,name,valueType
 * type DEFlat = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>
 * // → { id?: string; name?: string; valueType: ValueType }
 *
 * // Nested pick — mirrors ?fields=id,categoryCombo[id,name]
 * type DEWithCombo = PickWithFieldFilters<DataElement, ["id", "categoryCombo[id,name]"]>
 * // → { id?: string; categoryCombo?: { id?: string; name?: string } }
 * ```
 *
 * > **Limitation:** Nested picks only resolve fields that exist on the declared
 * > type. In this library, reference fields like `categoryCombo` are typed as
 * > `IdentifiableObject` (which has `id`, `name`, `code`, etc.) rather than the
 * > full concrete type. Fields not present on `IdentifiableObject` (e.g.
 * > `categories` on a `CategoryCombo`) are silently dropped from the result.
 * > This accurately reflects what the type system can know: deeper fields only
 * > exist at runtime when explicitly requested, and cannot be statically verified.
 */
export type PickWithFieldFilters<
    TModel,
    TFieldFilters extends readonly string[]
// NonNullable<TModel>: DeriveResourceTypeMap can produce optional-valued properties (when
// multiple path keys remap to the same resource name), so TModel may include `| undefined`.
// Stripping it ensures the pick is always over the concrete item type.
//
// Two branches to avoid `UnionToIntersection` over deferred homomorphic mapped types, which
// collapses to `never` when the union members iterate over `keyof TModel`:
//
// - Flat-only: all fields are plain keys or comma-split keys (no "[").
//   ExtractKeys unwraps comma-split strings ("id,name" → "id" | "name") so that a single
//   mapped type can pick all requested keys at once, avoiding the union-of-deferred-MTs problem.
//
// - Mixed: some fields contain "[" (nested). Use ExtractKeys on flat fields, and
//   UnionToIntersection on nested fields. Nested fields produce concrete single-key mapped
//   types (case 1 of RecursivePickWithFieldFilter uses `[K in Root]`, not `keyof TModel`),
//   so UnionToIntersection works correctly for them.
> = [ExtractNestedField<RemoveSpaces<TFieldFilters[number]>>] extends [never]
    // Flat-only: no nested fields.
    ? { [K in keyof NonNullable<TModel> as K extends ExtractKeys<RemoveSpaces<TFieldFilters[number]>> ? K : never]: NonNullable<TModel>[K] }
    // Mixed: flat + nested.
    : { [K in keyof NonNullable<TModel> as K extends ExtractKeys<ExtractFlatField<RemoveSpaces<TFieldFilters[number]>>> ? K : never]: NonNullable<TModel>[K] }
      & UnionToIntersection<
            RecursivePickWithFieldFilter<NonNullable<TModel>, RemoveSpaces<ExtractNestedField<TFieldFilters[number]>>>
        >
