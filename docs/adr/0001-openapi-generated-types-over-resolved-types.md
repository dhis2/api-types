# Use OpenAPI-generated types over hand-written or resolved types

## Status

Accepted

## Context and Problem Statement

Several DHIS2 front-end applications maintain their own TypeScript types for the DHIS2 REST API. As `@dhis2/api-types` is introduced as a shared library, we need to decide what form those types take: should they be generated directly from the OpenAPI specification (preserving its structure), or should they resolve `$ref` references into concrete named types the way other generators and hand-written approaches do?

## Decision Drivers

- Types should accurately reflect what the API actually returns, including partial responses from `?fields=` queries
- The library must cover every endpoint and schema without manual upkeep
- Adding a new DHIS2 API version should be a configuration change, not a porting effort
- Path and operation types (for use with `openapi-fetch`) must be derivable from the same source

## Considered Options

- **OpenAPI-generated with `openapi-typescript`** — generate from the official spec, preserve `$ref` structure, no reference resolution
- **OpenAPI-generated with `dhis2-open-api-ts`** — generate from the spec but resolve all references to concrete named types with runtime enums
- **Hand-written** — maintain types manually, covering only what each application needs

## Decision Outcome

Chosen option: **OpenAPI-generated with `openapi-typescript`**, because it is the only option that accurately represents what the DHIS2 API actually returns for any given `?fields=` query, and because it produces `paths` types that make type-safe HTTP clients possible.

### Positive Consequences

- Field optionality matches the spec: fields absent from `required` are marked optional, so partial responses type-check correctly
- Reference shapes match the API's default behaviour (see [The reference shape problem](#the-reference-shape-problem) below)
- Every endpoint and schema is covered automatically
- Adding a new DHIS2 version is a one-line change in `versions.ts`
- `paths` types enable fully type-safe use with `openapi-fetch`

### Negative Consequences

- No named top-level exports — consumers must alias: `type DataElement = components["schemas"]["DataElement"]`
- No utility types for paginated responses, gist responses, or field-filter-aware picking
- Enum values are string literal unions with no runtime object to iterate over

## Pros and Cons of the Options

### OpenAPI-generated with `openapi-typescript`

References are preserved as declared in the spec. In DHIS2's OpenAPI spec, nested objects in list responses are typed as `IdentifiableObject` — reflecting the fact that the API returns only `{ "id": "..." }` for references unless the caller explicitly requests more fields.

```ts
import type { components } from "@dhis2/api-types/v43"

type DataElement = components["schemas"]["DataElement"]
// categoryCombo?: IdentifiableObject  — what the API actually returns
// createdBy?:     UserDto
// aggregationType, domainType, valueType are required; everything else is optional

de.categoryCombo?.id           // ✓ always safe
de.categoryCombo?.categories   // ✗ type error — IdentifiableObject has no 'categories'
```

- Good, because reference shapes match what the API actually sends
- Good, because path and operation types cover the entire API surface
- Good, because generation is fully automated from a spec URL
- Good, because enum values are usable as string literals without a runtime import
- Bad, because `components["schemas"]["..."]` indirection requires a local alias
- Bad, because no utility types are provided for paginated responses or field-filter picking

### OpenAPI-generated with `dhis2-open-api-ts`

References are resolved: `categoryCombo` becomes `CategoryCombo`, `createdBy` becomes `User`. Every field is required. Enums become runtime TypeScript `enum` objects in a namespace. Rich utility types are included.

```ts
import { DataElement } from "@dhis2mma/types"

const de: DataElement = {
    aggregationType: DataElement.aggregationType.SUM,  // runtime enum
    categoryCombo: {                                   // full CategoryCombo, all fields required
        id: "bjDvmb4bfuf",
        name: "default",
        categories: [...],
    },
    // 30+ more required fields
}

// PickWithFieldFilters mirrors the ?fields= query in the type system
type DEWithCombo = PickWithFieldFilters<
    DataElement,
    ["id", "name", "categoryCombo[id,displayName,categories[id,displayName]]"]
>
de.categoryCombo.categories[0].displayName  // ✓ fully typed
```

- Good, because direct named imports — no `components["schemas"]` indirection
- Good, because resolved references are easy to navigate in an IDE
- Good, because `PickWithFieldFilters` models the `?fields=` pattern in the type system
- Good, because utility types cover paginated and gist responses
- Bad, because all fields required — structurally wrong for any partial response (see below)
- Bad, because resolved references imply data that is not present in default responses
- Bad, because runtime enum objects must be imported to use enum values in conditions
- Bad, because `paths` types are not produced — no type-safe HTTP client support

### Hand-written

Types are authored manually, covering only the exact fields the application reads. The wire format sits alongside a transformed internal shape with camelCase field names.

```ts
// Wire format — only fields the app reads
type ApiEnrollmentEvent = {
    event: string
    status: 'ACTIVE' | 'VISITED' | 'COMPLETED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED'
    dataValues: Array<{ dataElement: string; value: string }>
    occurredAt: string
}

// Internal shape — after the app transforms the response
type CaptureClientEvent = {
    eventId: string      // renamed from event
    programId: string    // renamed from program
    status: 'ACTIVE' | 'VISITED' | 'COMPLETED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED'
    [key: string]: any   // escape hatch for dynamic fields
}
```

- Good, because types describe exactly the data the application uses
- Good, because internal representations can use different naming conventions
- Neutral, because index signatures (`[key: string]: any`) are common, reducing safety
- Bad, because types drift from the spec silently
- Bad, because new endpoints or fields require manual updates
- Bad, because not reusable across applications

## The reference shape problem

This is the most consequential difference between the options and the primary reason for this decision.

### What the API actually returns

DHIS2 uses `?fields=` extensively. Without field expansion, nested references come back as bare identifiers:

```json
GET /api/dataElements?fields=id,name,categoryCombo

{
  "dataElements": [
    {
      "id": "fbfJHSPpUQD",
      "name": "ANC 1st visit",
      "categoryCombo": { "id": "bjDvmb4bfuf" }
    }
  ]
}
```

`categoryCombo` here is not a `CategoryCombo`. It is an object with only `id`. The full `CategoryCombo` shape — with `categories`, `categoryOptionCombos`, etc. — only arrives when explicitly requested:

```
?fields=id,name,categoryCombo[id,name,categories[id,name]]
```

### How each option handles this

| | `categoryCombo` type | Accurate for `?fields=id,name,categoryCombo`? |
|---|---|---|
| `openapi-typescript` | `IdentifiableObject` | Yes — `{id}` is what arrives |
| `dhis2-open-api-ts` | `CategoryCombo` | No — implies all `CategoryCombo` fields present |
| Hand-written | omitted or `any` | Depends on the specific type |

With `dhis2-open-api-ts`, code like `de.categoryCombo.categories[0].displayName` passes type-checking but throws at runtime if `categories` was not in the `?fields=` query. The type system offers no protection against this class of bug.

With `openapi-typescript`, the same access is a type error. To type a response that includes expanded fields, the caller narrows the type explicitly — either inline or via a utility type:

```ts
// Inline narrowing — caller declares what fields they requested
type DEWithCombo = {
    id?: string
    name?: string
    categoryCombo?: {
        id?: string
        categories?: components["schemas"]["Category"][]
    }
}

// Or, if a PickWithFieldFilters utility were available (it isn't yet in this library):
type DEWithCombo = PickWithFieldFilters<
    DataElement,
    ["id", "name", "categoryCombo[id,categories[id,name]]"]
>
```

The indirection is more work, but it makes the type reflect what was actually requested. The gap between "what you typed" and "what arrived" — the source of many subtle bugs — does not exist.
