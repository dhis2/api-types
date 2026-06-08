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
    // Case 3 — plain key
    : S extends keyof Model
        ? Pick<Model, S>
    : never

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
export type PagedResponse<T, Key extends string> = Prettify<
    { pager: Pager } & { [K in Key]: T[] }
>

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
 * // → { id?: string; name?: string; valueType?: ValueType }
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
> = Prettify<
    UnionToIntersection<
        RecursivePickWithFieldFilter<TModel, RemoveSpaces<TFieldFilters[number]>>
    >
>
